import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Building2, Eye, EyeOff, Scroll, Check, AlertTriangle } from 'lucide-react';
import { TERMS_SECTIONS, TERMS_METADATA } from '../data/terms';
import FirebaseErrorAlert from './FirebaseErrorAlert';

const professions = ['Executive', 'Manager', 'Consultant', 'Entrepreneur', 'Student', 'Other'];
const genders = ['Male', 'Female', 'Other'];
const statesAndCities: Record<string, string[]> = {
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli'],
  'Delhi': ['New Delhi'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara']
};

export default function Register() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const invitedBy = searchParams.get('invitedBy') || localStorage.getItem('pending_invitedBy');
  const enterpriseInvitedBy = searchParams.get('enterpriseInvitedBy') || localStorage.getItem('pending_enterprise_invitedBy');
  const [userType, setUserType] = useState<'individual' | 'enterprise'>('individual');
  const [inviterCompany, setInviterCompany] = useState('');
  const [inviterDomain, setInviterDomain] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    profession: '',
    state: '',
    city: '',
    gender: '',
    // Enterprise specific fields
    designation: '',
    company: '',
    location: ''
  });
  const [error, setError] = useState('');
  const [orphanEmail, setOrphanEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [orphanResetting, setOrphanResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Capture and save invite/referral parameters to localStorage immediately on mount or query change
    const qInvitedBy = searchParams.get('invitedBy');
    const qEnterpriseInvitedBy = searchParams.get('enterpriseInvitedBy');
    const qEmail = searchParams.get('email');
    const qName = searchParams.get('name');
    const qDesignation = searchParams.get('designation');

    if (qInvitedBy) {
      localStorage.setItem('pending_invitedBy', qInvitedBy);
    }
    if (qEnterpriseInvitedBy) {
      localStorage.setItem('pending_enterprise_invitedBy', qEnterpriseInvitedBy);
    }
    if (qEmail) {
      localStorage.setItem('pending_enterprise_email', decodeURIComponent(qEmail));
    }
    if (qName) {
      localStorage.setItem('pending_enterprise_name', decodeURIComponent(qName));
    }
    if (qDesignation) {
      localStorage.setItem('pending_enterprise_designation', decodeURIComponent(qDesignation));
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (user && !profile) {
      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        name: prev.name || user.displayName || ''
      }));
    }
  }, [user, profile]);

  useEffect(() => {
    if (enterpriseInvitedBy) {
      setUserType('enterprise');
      getDoc(doc(db, 'users', enterpriseInvitedBy)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setInviterCompany(data.company || '');
          const inviterEmail = data.email || '';
          const domain = inviterEmail.trim().split('@')[1]?.toLowerCase() || '';
          setInviterDomain(domain);
          setFormData(prev => ({
            ...prev,
            company: data.company || '',
            location: data.location || ''
          }));
        }
      }).catch(err => {
        console.error("Error fetching inviter info:", err);
      });
    }
  }, [enterpriseInvitedBy]);

  useEffect(() => {
    const pEmail = searchParams.get('email') || localStorage.getItem('pending_enterprise_email');
    const pName = searchParams.get('name') || localStorage.getItem('pending_enterprise_name');
    const pDesignation = searchParams.get('designation') || localStorage.getItem('pending_enterprise_designation');
    if (pEmail || pName || pDesignation) {
      setFormData(prev => ({
        ...prev,
        email: pEmail ? decodeURIComponent(pEmail) : prev.email,
        name: pName ? decodeURIComponent(pName) : prev.name,
        designation: pDesignation ? decodeURIComponent(pDesignation) : prev.designation
      }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isOfficialEmail = (email: string) => {
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
      'msn.com', 'yandex.com', 'gmx.com'
    ];
    const domain = email.trim().split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return !genericDomains.includes(domain);
  };

  const establishFriendship = async (newUserId: string, newUserName: string, newUserEmail: string) => {
    if (!invitedBy) return;
    try {
      const inviterDocRef = doc(db, 'users', invitedBy);
      const inviterSnap = await getDoc(inviterDocRef);
      const inviterData = inviterSnap.exists() ? inviterSnap.data() : null;

      const inviterName = inviterData?.name || 'BeyondEQ Member';
      const inviterEmail = inviterData?.email || 'info@beyondeq.org';

      // 1. Write friend doc under inviter's friends collection
      try {
        await setDoc(doc(db, 'users', invitedBy, 'friends', newUserId), {
          friendId: newUserId,
          friendName: newUserName,
          friendEmail: newUserEmail,
          streak: 1,
          lastActive: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${invitedBy}/friends/${newUserId}`);
        return;
      }

      // 2. Write friend doc under new user's friends collection
      try {
        await setDoc(doc(db, 'users', newUserId, 'friends', invitedBy), {
          friendId: invitedBy,
          friendName: inviterName,
          friendEmail: inviterEmail,
          streak: 1,
          lastActive: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${newUserId}/friends/${invitedBy}`);
        return;
      }
    } catch (err) {
      console.error("Error establishing mutual friendship connection:", err);
    }
  };

  const saveProfile = async (uid: string, authEmail: string) => {
    try {
      const dataToSave: any = {
        uid,
        email: formData.email || authEmail,
        userType,
        name: formData.name,
        createdAt: serverTimestamp()
      };

      if (userType === 'enterprise') {
        dataToSave.designation = formData.designation;
        dataToSave.company = formData.company;
        dataToSave.phone = formData.phone;
        dataToSave.location = formData.location;
        dataToSave.tier = 'free'; // Starts on free, but for enterprise, Assessments 1-4 are free, 5th requires premium
        dataToSave.enterpriseAssessmentsCompleted = {
          1: false,
          2: false,
          3: false,
          4: false
        };
        if (enterpriseInvitedBy) {
          dataToSave.enterpriseInvitedBy = enterpriseInvitedBy;
        }
      } else {
        dataToSave.phone = formData.phone || '';
        dataToSave.age = parseInt(formData.age) || 0;
        dataToSave.profession = formData.profession;
        dataToSave.state = formData.state;
        dataToSave.city = formData.city || '';
        dataToSave.gender = formData.gender;
        dataToSave.tier = 'free';
        if (enterpriseInvitedBy) {
          dataToSave.enterpriseInvitedBy = enterpriseInvitedBy;
          dataToSave.company = inviterCompany || formData.company;
        }
      }

      if (invitedBy && userType === 'individual') {
        await establishFriendship(uid, formData.name, formData.email || authEmail);
      }

      if (enterpriseInvitedBy) {
        const cleanEmail = (formData.email || authEmail).trim().toLowerCase();
        try {
          await setDoc(doc(db, 'users', enterpriseInvitedBy, 'organizationInvites', uid), {
            uid: uid,
            name: formData.name,
            email: cleanEmail,
            status: 'registered',
            registeredAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${enterpriseInvitedBy}/organizationInvites/${uid}`);
          return;
        }
      }

      try {
        await setDoc(doc(db, 'users', uid), dataToSave);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        return;
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      setError('Please read and accept the Terms & Conditions of BeyondEQ in the checkbox before registry.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      
      const docRef = doc(db, 'users', u.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        return;
      }

      if (!docSnap.exists()) {
        const newName = u.displayName || u.email?.split('@')[0] || 'User';
        const newEmail = u.email || '';
        const dataToSave: any = {
          uid: u.uid,
          email: newEmail,
          name: newName,
          userType: 'individual',
          tier: 'free',
          createdAt: serverTimestamp()
        };

        if (invitedBy) {
          await establishFriendship(u.uid, newName, newEmail);
        }

        if (enterpriseInvitedBy) {
          let compName = '';
          try {
            const inviterSnap = await getDoc(doc(db, 'users', enterpriseInvitedBy));
            if (inviterSnap.exists()) {
              compName = inviterSnap.data().company || '';
            }
          } catch (e) {
            console.error(e);
          }
          dataToSave.enterpriseInvitedBy = enterpriseInvitedBy;
          dataToSave.company = compName;
        }

        try {
          await setDoc(docRef, dataToSave);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${u.uid}`);
          return;
        }

        if (enterpriseInvitedBy) {
          try {
            await setDoc(doc(db, 'users', enterpriseInvitedBy, 'organizationInvites', u.uid), {
              uid: u.uid,
              name: newName,
              email: newEmail.trim().toLowerCase(),
              status: 'registered',
              registeredAt: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${enterpriseInvitedBy}/organizationInvites/${u.uid}`);
            return;
          }
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('Please scroll through and accept the Terms & Conditions of BeyondEQ below before sign-up.');
      return;
    }

    const isCurrentUser = user && user.email?.toLowerCase() === formData.email.trim().toLowerCase();

    // Check common fields - password is only required if user is not already authenticated
    if (!formData.name || !formData.email || (!formData.password && !isCurrentUser)) {
      setError('Please fill in physical details: Name, Email and Password.');
      return;
    }

    if (userType === 'enterprise') {
      const passwordCompulsory = !isCurrentUser;
      if (!formData.designation || !formData.company || !formData.phone || !formData.location || (!formData.password && passwordCompulsory)) {
        setError(passwordCompulsory 
          ? 'For Enterprise registration, Name, Email, Password, Designation, Company Name, Phone, and Location are compulsory.'
          : 'For Enterprise registration, Name, Email, Designation, Company Name, Phone, and Location are compulsory.'
        );
        return;
      }
      
      // Bylaw: If the user was invited to a multi-rater team via an explicit referral parameter, bypass high-restriction checks to ensure onboarding succeeds seamlessly!
      const isInvited = !!enterpriseInvitedBy;
      
      if (!isInvited && !isOfficialEmail(formData.email)) {
        setError('Please use your official/corporate email ID to register (e.g. name@company.com). Public providers like Gmail or Yahoo are restricted for enterprise partnerships.');
        return;
      }

      if (!isInvited && enterpriseInvitedBy && inviterDomain) {
        const userDomain = formData.email.trim().split('@')[1]?.toLowerCase() || '';
        if (userDomain !== inviterDomain) {
          setError(`Domain mismatch: Your organization is registered under the domain '@${inviterDomain}'. You must register with an official email ending in '@${inviterDomain}' to join their team.`);
          return;
        }
      }
    } else {
      const passwordCompulsory = !isCurrentUser;
      if (!formData.age || !formData.profession || !formData.state || !formData.gender || (!formData.password && passwordCompulsory)) {
        setError(passwordCompulsory
          ? 'Name, Email, Password, Age, Profession, State, and Gender are compulsory.'
          : 'Name, Email, Age, Profession, State, and Gender are compulsory.'
        );
        return;
      }
    }

    try {
      if (isCurrentUser) {
        // Since user is already authenticated in Firebase Auth, but lacks a Firestore user profile document,
        // we can save their profile directly under this uid!
        await saveProfile(user.uid, user.email || formData.email);
      } else {
        try {
          const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          await saveProfile(result.user.uid, formData.email);
        } catch (createErr: any) {
          const isEmailInUse = createErr.code === 'auth/email-already-in-use' || 
                               (createErr.message && createErr.message.toLowerCase().includes('email-already-in-use'));
          
          if (isEmailInUse) {
            // Let's check if the document actually exists in Firestore using a list query
            let profileExists = false;
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', formData.email.trim()));
              const querySnap = await getDocs(q);
              profileExists = !querySnap.empty;
            } catch (queryErr) {
              console.error("Error checking Firestore profile:", queryErr);
            }

            if (!profileExists) {
              // The email is in Firebase Auth, but NOT in Firestore! This is an orphaned/purged account.
              // Let's see if we can log in with the typed password:
              try {
                const loginResult = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                // Log in succeeded! Correct password. Recreate the profile.
                await saveProfile(loginResult.user.uid, formData.email);
              } catch (loginErr) {
                // Log in failed (likely wrong password). Trigger modern sandbox restore flow.
                setOrphanEmail(formData.email.trim());
                throw new Error("SANDBOX_ORPHAN_PROFILE_DETECTED");
              }
            } else {
              // The profile already exists, so it's a normal already registered email
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      }
    } catch (err: any) {
      if (err.message === "SANDBOX_ORPHAN_PROFILE_DETECTED") {
        setError("SANDBOX_ORPHAN_PROFILE_DETECTED");
      } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Firebase Error (auth/operation-not-allowed): Email/Password authentication is not enabled in your Firebase project. To fix this, please open your Firebase Console -> select "Authentication" -> select "Sign-in method" -> click "Add new provider" -> choose "Email/Password" -> toggle "Enable" then click Save.');
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-24 pb-32 bg-white relative overflow-y-auto">
      {/* Background Brain/Heart image (Optional, but keeping theme) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img src="/hero.png" alt="background" className="w-full h-full object-cover" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl p-5 sm:p-12 bg-white/40 backdrop-blur-xl border border-gray-200/50 rounded-3xl sm:rounded-[40px] shadow-2xl"
      >
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-48 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-black uppercase tracking-widest">Registration</h2>
          <p className="text-gray-650 text-xs font-semibold mt-2 uppercase tracking-wider">
            {userType === 'individual' ? 'Join as an Individual' : 'Register your Enterprise Team'}
          </p>
        </div>

        {/* Individual / Enterprise Toggle Tabs */}
        {!enterpriseInvitedBy && (
          <div className="flex p-1.5 bg-stone-100 border border-stone-200/50 rounded-2xl mb-8 max-w-sm mx-auto shadow-inner">
            <button
              type="button"
              onClick={() => {
                setUserType('individual');
                setError('');
              }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                userType === 'individual' 
                  ? 'bg-[#104C64] text-white shadow-md' 
                  : 'text-stone-550 hover:text-stone-900 bg-transparent'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Individual
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('enterprise');
                setError('');
              }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                userType === 'enterprise' 
                  ? 'bg-[#104C64] text-white shadow-md' 
                  : 'text-stone-550 hover:text-stone-900 bg-transparent'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Enterprise
            </button>
          </div>
        )}

        {enterpriseInvitedBy && inviterCompany && (
          <div className="p-4 mb-6 bg-amber-50/80 border border-amber-200 text-amber-950 text-xs font-sans font-bold rounded-2xl text-center leading-relaxed">
            ✨ You are joining the corporate workspace of <span className="underline decoration-amber-400 font-extrabold">{inviterCompany}</span>! Complete your registration below to start.
          </div>
        )}

        {error === "SANDBOX_ORPHAN_PROFILE_DETECTED" ? (
          <div className="p-6 mb-8 bg-amber-50 border border-amber-200 text-amber-950 font-sans rounded-[24px] text-left leading-relaxed shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-750 shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Orphaned Sandbox Account Detected
                </h4>
                <p className="text-[11px] text-amber-850 font-medium">
                  This email ID already exists in your Firebase Authentication database, but your profile details were purged during a sandbox reset. Your login credentials are intact, but you need to either log in using your original password or reset it to recreate your profile.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-sans">
                🔐 Recommended Actions:
              </div>
              
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setOrphanEmail('');
                    navigate('/login');
                  }}
                  className="w-full py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center font-sans shadow-sm"
                >
                  Go to Login Screen & Restore Profile
                </button>

                <button
                  type="button"
                  disabled={orphanResetting || resetSent}
                  onClick={async () => {
                    setOrphanResetting(true);
                    try {
                      await sendPasswordResetEmail(auth, orphanEmail);
                      setResetSent(true);
                    } catch (e: any) {
                      console.error(e);
                      setError(e.message);
                    } finally {
                      setOrphanResetting(false);
                    }
                  }}
                  className="w-full py-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-250 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center font-sans flex items-center justify-center gap-2"
                >
                  {orphanResetting ? (
                    <>Sending reset...</>
                  ) : resetSent ? (
                    <>✨ Reset Link Dispatched Successfully!</>
                  ) : (
                    <>Send Password Reset Link via Email</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setOrphanEmail('');
                  }}
                  className="w-full py-2 text-stone-500 hover:text-stone-800 hover:underline text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer"
                >
                  Clear and choose another Email ID
                </button>
              </div>

              {resetSent && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 font-sans text-[11px] font-bold rounded-2xl text-center shadow-inner">
                  📬 A password reset email was dispatched to <span className="underline decoration-emerald-400 font-extrabold">{orphanEmail}</span>! Open the link in your inbox to update your password, then login to automatically recreate your dynamic profile.
                </div>
              )}
            </div>
          </div>
        ) : error && (
          <FirebaseErrorAlert error={error} onClear={() => {
            setError('');
            setOrphanEmail('');
          }} userType={userType} />
        )}

        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COMMON FIELD 1: Name */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-black">
              {userType === 'individual' ? 'Name *' : 'Name of Person *'}
            </label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleChange}
              className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
              placeholder={userType === 'individual' ? 'Full Name' : 'Authorized Person Full Name'} 
              required
            />
          </div>

          {/* COMMON FIELD 2: Email */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-black">
              {userType === 'individual' ? 'Email *' : 'Email ID *'}
            </label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange}
              className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
              placeholder={userType === 'individual' ? 'email@example.com' : 'yourname@company.com'} 
              required
            />
            {userType === 'enterprise' && (
              <span className="text-[9px] text-[#104C64] font-bold font-sans block leading-normal pt-1">
                {enterpriseInvitedBy && inviterDomain ? (
                  <>🔒 Only official coworker emails ending in <span className="underline font-black text-amber-600">@{inviterDomain}</span> can join this workspace</>
                ) : (
                  <>🔒 Official corporate email is mandatory (public email domains are restricted)</>
                )}
              </span>
            )}
          </div>

          {/* COMMON FIELD 3: Password */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-black">Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange}
                className="w-full p-4 pr-12 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs" 
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

          {/* DYNAMIC FIELDS FOR INDIVIDUAL USER */}
          {userType === 'individual' && (
            <>
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Age *</label>
                <input 
                  type="number" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs" 
                  placeholder="Your Age" 
                  required={userType === 'individual'}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs" 
                  placeholder="+91 XXXXX XXXXX" 
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Profession *</label>
                <select 
                  name="profession" 
                  value={formData.profession} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold text-stone-600"
                  required={userType === 'individual'}
                >
                  <option value="">Select Profession</option>
                  {professions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Gender *</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold text-stone-600"
                  required={userType === 'individual'}
                >
                  <option value="">Select Gender</option>
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">State *</label>
                <select 
                  name="state" 
                  value={formData.state} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold text-stone-600"
                  required={userType === 'individual'}
                >
                  <option value="">Select State</option>
                  {Object.keys(statesAndCities).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">City (Optional)</label>
                <select 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold text-stone-600"
                  disabled={!formData.state}
                >
                  <option value="">Select City</option>
                  {formData.state && statesAndCities[formData.state].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          {/* DYNAMIC FIELDS FOR ENTERPRISE PARTNER */}
          {userType === 'enterprise' && (
            <>
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Designation *</label>
                <input 
                  type="text" 
                  name="designation" 
                  value={formData.designation} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
                  placeholder="e.g. Director of HR, Lead Architect" 
                  required={userType === 'enterprise'}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Company Name *</label>
                <input 
                  type="text" 
                  name="company" 
                  value={formData.company} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
                  placeholder="Company/Organization Name" 
                  required={userType === 'enterprise'}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Phone Number *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
                  placeholder="e.g. +91 99999 99999" 
                  required={userType === 'enterprise'}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-black">Location *</label>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange}
                  className="w-full p-4 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#104C64]/20 transition-all font-sans text-xs font-semibold" 
                  placeholder="e.g. Chennai, TN" 
                  required={userType === 'enterprise'}
                />
              </div>
            </>
          )}

          {/* TERMS & CONDITIONS VIEWPORT (applicable to both individual and enterprise users) */}
          <div className="md:col-span-2 mt-4 p-6 bg-stone-50 rounded-3xl border border-stone-200 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Scroll className="w-4 h-4 text-[#104C64]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#104C64] mb-0">
                Terms &amp; Conditions of Use
              </h3>
              <span className="ml-auto text-[9px] font-mono text-stone-500 uppercase tracking-widest font-bold">
                Effective Jan 1, 2025
              </span>
            </div>

            <p className="text-[11px] text-stone-500 font-sans leading-relaxed mb-3">
              Please scroll through the agreement container below to read the legal terms applicable to both individual and enterprise users.
            </p>

            <div 
              className="h-32 overflow-y-auto p-4 bg-white border border-stone-200 rounded-2xl text-[10.5px] text-stone-600 space-y-4 font-sans leading-relaxed select-text"
              id="terms-scroll-box"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="font-bold text-stone-900 border-b border-stone-100 pb-1.5 mb-2 uppercase tracking-wide text-[9.5px]">
                BeyondEQ / EQC Global LLP Agreement
              </div>
              <p className="text-stone-700 italic">
                {TERMS_METADATA.summary}
              </p>
              
              {TERMS_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="font-bold text-[#104C64] uppercase tracking-wider text-[9.5px]">
                    {section.num} {section.title}
                  </div>
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-stone-500">
                      {p}
                    </p>
                  ))}
                </div>
              ))}

              <div className="pt-2 border-t border-stone-100 text-[9px] text-stone-400 italic">
                End of Terms. Governed by the Information Technology Act of India and Digital Personal Data Protection Act (DPDPA), 2023. Venue: Chennai, TN.
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <label className="relative flex items-center cursor-pointer select-none mt-0.5">
                <input 
                  type="checkbox"
                  id="accept-terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) {
                      setError('');
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  termsAccepted 
                    ? 'bg-[#104C64] border-[#104C64] text-white' 
                    : 'bg-white border-stone-300 hover:border-stone-450 shadow-sm'
                }`}>
                  {termsAccepted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-stone-850 font-sans block leading-none">
                  I accept the Terms and Conditions of BeyondEQ
                </span>
                <span className="text-[9.5px] text-stone-500 font-sans block leading-relaxed">
                  I confirm that I have read the contract. I agree that these terms govern my access as an individual or organization user under EQC Global LLP.
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 mt-6 flex flex-col items-center gap-6">
            <button 
              type="submit"
              disabled={!termsAccepted}
              className={`w-full py-4 font-bold uppercase tracking-[0.4em] text-sm rounded-full shadow-xl transition-all ${
                termsAccepted 
                  ? 'bg-[#104C64] hover:bg-[#0D3E52] text-white shadow-[#104C64]/20 cursor-pointer' 
                  : 'bg-stone-100 text-stone-400 border border-stone-250/60 shadow-none cursor-not-allowed opacity-75'
              }`}
            >
              Sign Up As {userType === 'individual' ? 'Individual' : 'Enterprise'}
            </button>

            {userType === 'individual' && (
              <>
                <div className="w-full flex items-center gap-4">
                  <div className="flex-1 h-[1px] bg-gray-200"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0">OR</p>
                  <div className="flex-1 h-[1px] bg-gray-200"></div>
                </div>

                <p className="text-center text-xs font-bold uppercase tracking-[0.4em] text-black mb-0 font-sans">Direct Sign-up</p>
                <div className="flex justify-center w-full">
                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={!termsAccepted}
                    className={`flex items-center justify-center gap-3 px-12 py-4 font-bold uppercase tracking-widest text-xs rounded-full border shadow-sm transition-all w-full ${
                      termsAccepted
                        ? 'bg-white hover:bg-stone-50 border-gray-200 text-black cursor-pointer'
                        : 'bg-stone-100 text-stone-400 border border-stone-250/60 shadow-none cursor-not-allowed opacity-75'
                    }`}
                  >
                    <img 
                      src="https://www.google.com/favicon.ico" 
                      className={`w-4 ${!termsAccepted ? 'grayscale opacity-40' : ''}`} 
                      alt="google" 
                    />
                    Continue with Google
                  </button>
                </div>
              </>
            )}

            {userType === 'enterprise' && (
              <p className="text-center text-[10px] text-stone-500 font-sans leading-relaxed block max-w-sm">
                * Enterprise partners unlock four assessment segments with a unified reporting matrix. Public Google sign-ups are restricted for secure audit validation.
              </p>
            )}
          </div>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Already have an account? <Link to="/login" className="text-[#104C64] hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
