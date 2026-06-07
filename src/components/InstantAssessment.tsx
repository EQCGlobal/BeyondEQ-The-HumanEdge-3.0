import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Loader2, KeyRound, ArrowRight } from 'lucide-react';

export default function InstantAssessment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adminId = searchParams.get('adminId');
  const inviteId = searchParams.get('inviteId');

  const [statusText, setStatusText] = useState('Verifying your unique access link...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback states for existing users who already have a master account password
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [fallbackPassword, setFallbackPassword] = useState('');
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Cache invite credentials to finalize setup when fallback login completes
  const [cachedInviteInfo, setCachedInviteInfo] = useState<{
    email: string;
    name: string;
    designation: string;
    companyName: string;
    companyLocation: string;
    adminId: string;
    inviteId: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function authorizeAndLogin() {
      if (!adminId || !inviteId) {
        if (active) setErrorMsg("Invalid link parameters. Please copy and paste the complete unique link from your email.");
        return;
      }

      try {
        // 1. Fetch organization invite to authenticate
        if (active) setStatusText('Verifying organization invitation link...');
        const inviteRef = doc(db, 'users', adminId, 'organizationInvites', inviteId);
        let inviteSnap;
        try {
          inviteSnap = await getDoc(inviteRef);
        } catch (err: any) {
          throw new Error(`[Step 1: Fetch Invite] Failed to fetch invitation. details: ${err.message}`);
        }

        if (!inviteSnap.exists()) {
          if (active) setErrorMsg("This unique access link does not exist or has been cancelled by the administrator.");
          return;
        }

        const inviteData = inviteSnap.data();

        // 2. Validate invite ID has not been used twice
        if (inviteData.status !== 'pending') {
          if (active) {
            setErrorMsg("This unique direct-access link has already been claimed. If you have already accessed the platform once, please use the standard Sign In option with your work email.");
          }
          return;
        }

        const email = inviteData.email.trim().toLowerCase();
        const name = (inviteData.name || '').trim() || email.split('@')[0] || 'Teammate';
        const designation = inviteData.designation || 'Teammate';

        // 3. Retrieve admin profile configuration to synchronize workspace variables
        if (active) setStatusText('Synchronizing workspace configuration...');
        let adminSnap;
        try {
          adminSnap = await getDoc(doc(db, 'users', adminId));
        } catch (err: any) {
          throw new Error(`[Step 3: Fetch Admin Profile] Failed to fetch partner configuration. details: ${err.message}`);
        }
        const adminData = adminSnap.exists() ? adminSnap.data() : null;
        const companyName = adminData?.company || 'Corporate Partner';
        const companyLocation = adminData?.location || '';

        // Save metadata fields to state so manual login overrides can utilize them
        if (active) {
          setCachedInviteInfo({
            email,
            name,
            designation,
            companyName,
            companyLocation,
            adminId,
            inviteId
          });
        }

        // 4. Check if there is an active logged-in browser session matching this email
        const currentLoggedInUser = auth.currentUser;
        if (currentLoggedInUser && currentLoggedInUser.email?.toLowerCase().trim() === email) {
          const uid = currentLoggedInUser.uid;
          if (active) setStatusText(`Recognized active secure session. Claiming seat for ${name}...`);
          await completeClaimAndProfileCreation(uid, email, name, designation, companyName, companyLocation);
          return;
        }

        // 5. Derive unique security credentials derived from invite ID for silent provisioning
        const password = `BeyondEQ_${inviteId}_Secure!`;

        if (active) setStatusText(`Connecting secure access session for ${name}...`);

        let userCredential;
        try {
          // Attempt a direct silent sign-in in case their credentials already exist in Firebase Auth
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          await completeClaimAndProfileCreation(uid, email, name, designation, companyName, companyLocation);
        } catch (signInErr: any) {
          const signInErrCode = String(signInErr.code || '').toLowerCase();
          const signInErrMsg = String(signInErr.message || '').toLowerCase();

          // Unregistered auth account or invalid credential. Silently build account for ultimate user convenience!
          if (
            signInErrCode === 'auth/user-not-found' || 
            signInErrCode === 'auth/invalid-credential' || 
            signInErrCode === 'auth/invalid-email' || 
            signInErrCode === 'auth/cannot-find-user' ||
            signInErrMsg.includes('invalid-credential') ||
            signInErrMsg.includes('user-not-found')
          ) {
            if (active) setStatusText(`Provisioning direct member profile...`);
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const uid = userCredential.user.uid;
              await completeClaimAndProfileCreation(uid, email, name, designation, companyName, companyLocation);
            } catch (createErr: any) {
              const errCodeString = String(createErr.code || '').toLowerCase();
              const errMsgString = String(createErr.message || '').toLowerCase();

              const isEmailAlreadyInUse = 
                errCodeString === 'auth/email-already-in-use' ||
                errCodeString.includes('email-already-in-use') ||
                errCodeString.includes('already-in-use') ||
                errMsgString.includes('email-already-in-use') ||
                errMsgString.includes('email_already_in_use') ||
                errMsgString.includes('already-in-use') ||
                errMsgString.includes('already_in_use');

              if (isEmailAlreadyInUse) {
                // The email already exists. This could be because of:
                // 1. A manual workspace setup with their own custom password.
                // 2. A Strict Mode race condition where a concurrent mount just finished creating the user under our default password.
                // To resolve this, let's do a quick double-check: Try signing in with the default password.
                try {
                  if (active) setStatusText('Completing session synchronization...');
                  userCredential = await signInWithEmailAndPassword(auth, email, password);
                  const uid = userCredential.user.uid;
                  await completeClaimAndProfileCreation(uid, email, name, designation, companyName, companyLocation);
                } catch (retrySignInErr: any) {
                  // If it failed to sign in with the default password, it's definitely a manual pre-existing account.
                  // We can now safely prompt them for their custom password.
                  if (active) {
                    setShowPasswordFallback(true);
                    setStatusText('');
                  }
                }
              } else {
                throw new Error(`[Step 4: Provision User] Failed to provision secure user account. details: ${createErr.message}`);
              }
            }
          } else {
            throw new Error(`[Step 4: Sign In User] Failed to sign in to secure user account. details: ${signInErr.message}`);
          }
        }

      } catch (err: any) {
        console.error("Direct access handler failed:", err);
        if (active) setErrorMsg(err.message || "An unexpected error occurred during direct workspace authorization.");
      }
    }

    // Subroutine to save profile and claim invite ID
    async function completeClaimAndProfileCreation(
      uid: string, 
      email: string, 
      name: string, 
      designation: string, 
      companyName: string, 
      companyLocation: string
    ) {
      if (active) setStatusText('Building your workplace profile...');
      const userProfileRef = doc(db, 'users', uid);
      let profileSnap;
      try {
        profileSnap = await getDoc(userProfileRef);
      } catch (err: any) {
        throw new Error(`[Step 5a: Fetch Profile] Failed to read profile. details: ${err.message}`);
      }

      try {
        if (!profileSnap.exists()) {
          const newProfile = {
            uid: uid,
            name: name,
            email: email,
            userType: 'enterprise',
            enterpriseInvitedBy: adminId,
            company: companyName,
            designation: designation,
            location: companyLocation,
            tier: 'free',
            enterpriseAssessmentsCompleted: {
              '1': false,
              '2': false,
              '3': false,
              '4': false
            },
            createdAt: serverTimestamp()
          };
          await setDoc(userProfileRef, newProfile);
        } else {
          await setDoc(userProfileRef, {
            userType: 'enterprise',
            enterpriseInvitedBy: adminId,
            company: companyName,
            designation: designation,
            location: companyLocation,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err: any) {
        throw new Error(`[Step 5b: Write Profile] Failed to synchronize profile. details: ${err.message}`);
      }

      // 6. Claim and seal the invitation document
      if (active) setStatusText('Clearing invitation status...');
      try {
        // Write the registered indicator under their new permanent Firebase UID
        await setDoc(doc(db, 'users', adminId, 'organizationInvites', uid), {
          uid: uid,
          name: name,
          email: email,
          designation: designation,
          status: 'registered',
          registeredAt: serverTimestamp()
        });
      } catch (err: any) {
        throw new Error(`[Step 6a: Create Claim Log] Failed. details: ${err.message}`);
      }

      // Update the original temporary invite to ensure it cannot be loaded twice
      if (inviteId !== uid) {
        try {
          await setDoc(doc(db, 'users', adminId, 'organizationInvites', inviteId), {
            status: 'claimed',
            claimedAt: serverTimestamp(),
            claimedBy: uid
          }, { merge: true });
        } catch (err: any) {
          throw new Error(`[Step 6b: Seal Invite Document] Failed. details: ${err.message}`);
        }
      }

      if (active) {
        setStatusText("Direct access authorized. Directing you to your workspace...");
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    }

    authorizeAndLogin();

    return () => {
      active = false;
    };
  }, [adminId, inviteId, navigate]);

  // Handle existing account validation override
  const handleVerifyFallbackPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackPassword) {
      setFallbackError('Please enter your password.');
      return;
    }
    if (!cachedInviteInfo) {
      setFallbackError('Invited session data is missing. Please reload the page.');
      return;
    }

    setFallbackLoading(true);
    setFallbackError(null);

    const { email, name, designation, companyName, companyLocation, adminId, inviteId } = cachedInviteInfo;

    try {
      // 1. Authenticate identity with their pre-established credential
      const userCredential = await signInWithEmailAndPassword(auth, email, fallbackPassword);
      const uid = userCredential.user.uid;

      // 2. Align user workplace profile
      const userProfileRef = doc(db, 'users', uid);
      const profileSnap = await getDoc(userProfileRef);

      if (!profileSnap.exists()) {
        const newProfile = {
          uid: uid,
          name: name,
          email: email,
          userType: 'enterprise',
          enterpriseInvitedBy: adminId,
          company: companyName,
          designation: designation,
          location: companyLocation,
          tier: 'free',
          enterpriseAssessmentsCompleted: {
            '1': false,
            '2': false,
            '3': false,
            '4': false
          },
          createdAt: serverTimestamp()
        };
        await setDoc(userProfileRef, newProfile);
      } else {
        await setDoc(userProfileRef, {
          userType: 'enterprise',
          enterpriseInvitedBy: adminId,
          company: companyName,
          designation: designation,
          location: companyLocation
        }, { merge: true });
      }

      // 3. Log claim status in the organization invites registry
      await setDoc(doc(db, 'users', adminId, 'organizationInvites', uid), {
        uid: uid,
        name: name,
        email: email,
        designation: designation,
        status: 'registered',
        registeredAt: serverTimestamp()
      });

      // Update the original temporary invite to ensure it cannot be loaded twice
      if (inviteId !== uid) {
        await setDoc(doc(db, 'users', adminId, 'organizationInvites', inviteId), {
          status: 'claimed',
          claimedAt: serverTimestamp(),
          claimedBy: uid
        }, { merge: true });
      }

      setFallbackLoading(false);
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Manual validation claim failed:', err);
      setFallbackLoading(false);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setFallbackError('Invalid account password. Please try again or request a reset.');
      } else {
        setFallbackError(err.message || 'Verification failed. Please contact your workspace administrator.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 selection:bg-[#41B1C2] selection:text-white font-sans relative">
      {/* Visual background elements */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#41B1C2]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#104C64]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[35px] border border-stone-200/60 shadow-xl relative z-10 space-y-6">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="BeyondEQ Logo" className="w-40 h-auto" />
        </div>

        {errorMsg ? (
          <div className="space-y-4 animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-lg font-black font-mono">
              !
            </div>
            <h3 className="text-sm font-black text-stone-850 uppercase tracking-wider">Access Restricted</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-semibold">
              {errorMsg}
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-750 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        ) : showPasswordFallback ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-stone-50 text-[#104C64] flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-stone-850 uppercase tracking-widest">Verify Your Password</h3>
              <p className="text-[11px] text-stone-500 font-semibold leading-relaxed">
                An active BeyondEQ account already exists for <strong className="text-stone-700 font-bold">{cachedInviteInfo?.email}</strong>. 
                Please enter your password to instant-claim your corporate license seat.
              </p>
            </div>

            <form onSubmit={handleVerifyFallbackPassword} className="space-y-3 pt-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#104C64] mb-1.5 pl-1">
                  Access Password
                </label>
                <input
                  type="password"
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#41B1C2]/30 focus:border-[#41B1C2] text-xs font-semibold placeholder-stone-400 text-stone-800 transition-all"
                  required
                />
              </div>

              {fallbackError && (
                <p className="text-[10px] text-red-600 font-bold pl-1 leading-relaxed">
                  {fallbackError}
                </p>
              )}

              <button
                type="submit"
                disabled={fallbackLoading}
                className="w-full py-3 bg-[#104C64] hover:bg-[#104C64]/95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                {fallbackLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Authorizing Session...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Claim Seat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => navigate('/login')}
                className="text-[10px] font-bold text-[#41B1C2] hover:underline"
              >
                Use alternative email signature
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn animate-pulse text-center">
            <div className="flex justify-center py-2">
              <Loader2 className="w-8 h-8 text-[#104C64] animate-spin stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-[#104C64] uppercase tracking-widest">
              Securing Workgroup Session
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-semibold">
              {statusText}
            </p>
            <span className="text-[9px] font-black inline-block text-stone-400 uppercase tracking-widest pt-2">
              Authorized SSO Link &bull; Direct Session Inbound
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
