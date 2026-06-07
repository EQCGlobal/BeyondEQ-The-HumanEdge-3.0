import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertTriangle, Trash2, Loader2, Check } from 'lucide-react';
import FirebaseErrorAlert from './FirebaseErrorAlert';

export default function Login() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const navigate = useNavigate();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(`A password reset link has been sent to ${email}. Redirecting you to the sign-in page in a few seconds...`);
      setTimeout(() => {
        setIsResetMode(false);
        setResetSuccess('');
      }, 4000);
    } catch (err: any) {
      if (err.message && err.message.includes('auth/user-not-found')) {
        setError('No account found with this email. Please register first.');
      } else if (err.message && err.message.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message);
      }
    }
  };

  const [isPurging, setIsPurging] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  useEffect(() => {
    if (user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Firebase Error (auth/operation-not-allowed): Email/Password authentication is not enabled in your Firebase project. To fix this, please open your Firebase Console -> select "Authentication" -> select "Sign-in method" -> click "Add new provider" -> choose "Email/Password" -> toggle "Enable" then click Save.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleGoogleLogin = async () => {
    let u;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      u = result.user;
    } catch (err: any) {
      setError(err.message);
      return;
    }

    try {
      const docRef = doc(db, 'users', u.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        return;
      }

      if (!docSnap.exists()) {
        try {
          await setDoc(docRef, {
            uid: u.uid,
            email: u.email || '',
            name: u.displayName || u.email?.split('@')[0] || 'User',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${u.uid}`);
          return;
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePurgeAllData = async () => {
    setIsPurging(true);
    setPurgeStatus('Initializing global reset...');
    try {
      // 1. Clear Promo Codes
      setPurgeStatus('Fetching promo codes...');
      let promoCodesSnap;
      try {
        promoCodesSnap = await getDocs(collection(db, 'promoCodes'));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'promoCodes');
        return;
      }

      for (const promoDoc of promoCodesSnap.docs) {
        setPurgeStatus(`Clearing promo code: ${promoDoc.id}...`);
        try {
          await deleteDoc(doc(db, 'promoCodes', promoDoc.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `promoCodes/${promoDoc.id}`);
          return;
        }
      }

      // 2. Clear Users
      setPurgeStatus('Fetching registered users...');
      let usersSnap;
      try {
        usersSnap = await getDocs(collection(db, 'users'));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
        return;
      }

      let usersCleared = 0;

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userEmail = userDoc.data().email || 'No email';
        setPurgeStatus(`Clearing sub-collections for ${userEmail}...`);

        // Friends Subcollection
        let friendsSnap;
        try {
          friendsSnap = await getDocs(collection(db, 'users', userId, 'friends'));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, `users/${userId}/friends`);
          return;
        }

        for (const friendDoc of friendsSnap.docs) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'friends', friendDoc.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${userId}/friends/${friendDoc.id}`);
            return;
          }
        }

        // Reflections Subcollection
        let reflectionsSnap;
        try {
          reflectionsSnap = await getDocs(collection(db, 'users', userId, 'reflections'));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, `users/${userId}/reflections`);
          return;
        }

        for (const reflectionDoc of reflectionsSnap.docs) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'reflections', reflectionDoc.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${userId}/reflections/${reflectionDoc.id}`);
            return;
          }
        }

        // Organization Invites Subcollection
        let invitesSnap;
        try {
          invitesSnap = await getDocs(collection(db, 'users', userId, 'organizationInvites'));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, `users/${userId}/organizationInvites`);
          return;
        }

        for (const inviteDoc of invitesSnap.docs) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'organizationInvites', inviteDoc.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${userId}/organizationInvites/${inviteDoc.id}`);
            return;
          }
        }

        // Delete user profile document
        setPurgeStatus(`Deleting profile for ${userEmail}...`);
        try {
          await deleteDoc(doc(db, 'users', userId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
          return;
        }
        usersCleared++;
      }

      setPurgeStatus(`Successfully purged ${usersCleared} users and all associated diagnostic data!`);
      setPurgeSuccess(true);
    } catch (err: any) {
      console.error(err);
      setPurgeStatus(`Error: ${err.message || err}`);
    } finally {
      setIsPurging(false);
    }
  };

  const isOfficialEmail = (emailStr: string) => {
    const generic = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
      'msn.com', 'yandex.com', 'gmx.com'
    ];
    const dm = emailStr.trim().split('@')[1]?.toLowerCase();
    if (!dm) return false;
    return !generic.includes(dm);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 md:py-32 pb-40 bg-white relative overflow-y-auto gap-6">
      {/* Background Brain/Heart image */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <img src="/hero.png" alt="background" className="w-full h-full object-cover" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white/80 backdrop-blur-2xl border border-gray-100 rounded-3xl sm:rounded-[40px] shadow-2xl p-5 sm:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-[#104C64] uppercase tracking-[0.2em] mb-2 font-sans italic">
            {isResetMode ? "Reset Password" : "Sign In"}
          </h1>
          <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-[0.4em]">
            {isResetMode ? "Recover your credentials" : "Welcome back to BeyondEQ"}
          </p>
        </div>

        {error && (
          <FirebaseErrorAlert error={error} onClear={() => setError('')} userType={isOfficialEmail(email) ? 'enterprise' : 'individual'} />
        )}

        {resetSuccess && (
          <div className="mb-6 p-4 bg-[#41B1C2]/10 border border-[#41B1C2]/20 rounded-2xl text-[11px] font-bold text-[#104C64] uppercase tracking-wider leading-relaxed text-center">
            {resetSuccess}
          </div>
        )}

        {isResetMode ? (
          <form noValidate onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-black">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans" 
                placeholder="email@example.com"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold uppercase tracking-[0.4em] text-sm rounded-full shadow-xl shadow-[#104C64]/20 transition-all mt-4 cursor-pointer"
            >
              Send Reset Link
            </button>

            <button 
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setResetSuccess('');
              }}
              className="w-full text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#104C64] hover:underline"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form noValidate onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-black">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans" 
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Password</label>
                <button 
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setResetSuccess('');
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#104C64] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans" 
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#104C64] opacity-60 hover:opacity-100 transition-opacity focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold uppercase tracking-[0.4em] text-sm rounded-full shadow-xl shadow-[#104C64]/20 transition-all mt-4 cursor-pointer"
            >
              Sign In
            </button>

            <div className="flex items-center gap-4 py-4">
              <div className="flex-1 h-[1px] bg-gray-100"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">OR</p>
              <div className="flex-1 h-[1px] bg-gray-100"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-12 py-4 bg-white/80 hover:bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full border border-gray-200 shadow-sm transition-all cursor-pointer"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4" alt="google" />
              Continue with Google
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Don't have an account? <Link to="/register" className="text-[#104C64] hover:underline">Register Now</Link>
        </p>
      </motion.div>

      {/* Dev Environment Purge Suite */}
      <div className="w-full max-w-xl relative z-10 bg-stone-50 border border-stone-200 rounded-[30px] p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest font-sans flex items-center gap-1.5 flex-wrap">
              <span>🔧</span>
              <span>Developer Sandbox Reset</span>
            </h4>
            <p className="text-[10px] text-stone-500 leading-normal font-sans font-medium">
              Wipe out all registered testing profiles, organization maps, and associated diagnostic results from the active database to start a fresh evaluation.
            </p>
          </div>
          <button
            onClick={() => {
              setPurgeSuccess(false);
              setPurgeStatus('');
              setShowPurgeModal(true);
            }}
            className="px-4 py-2.5 bg-[#104C64] hover:bg-[#0D3E52] text-white rounded-xl font-black text-[9.5px]/none uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0 font-sans"
          >
            Purge All Data
          </button>
        </div>
      </div>

      {/* Custom React-State Confirmation & Execution Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md transition-all">
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-[40px] border border-stone-100 shadow-2xl p-8 md:p-10 space-y-6 text-center select-none"
          >
            {!isPurging && !purgeSuccess ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-600 mb-2">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider italic">Confirm Global Purge</h3>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans font-medium">
                    This will permanently delete all testing accounts, rater diagnostics scores, organizational dynamic maps, and custom invite codes. There is no reverse control for this action.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(false)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold uppercase tracking-wider text-[11px] rounded-full transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePurgeAllData}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-[11px] rounded-full shadow-lg shadow-red-600/15 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge All Data
                  </button>
                </div>
              </>
            ) : isPurging ? (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-[#104C64] animate-spin mb-2">
                  <Loader2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider italic">Purge In Progress</h3>
                  <p className="text-[11px] text-stone-500 font-mono tracking-wide leading-relaxed p-4 bg-stone-50 border border-stone-100 rounded-2xl max-w-sm mx-auto break-all">
                    {purgeStatus}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-emerald-800 uppercase tracking-wider italic">All Data Purged</h3>
                  <p className="text-xs text-stone-500 leading-relaxed font-sans font-medium">
                    The live active testing sandbox database has been completely cleared and reset.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold uppercase tracking-wider text-[11px] rounded-full shadow-lg shadow-[#104C64]/20 transition-all"
                >
                  Confirm & Reload
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
