import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  profession?: string;
  state?: string;
  city?: string;
  gender?: string;
  userType?: 'individual' | 'enterprise';
  designation?: string;
  company?: string;
  location?: string;
  tier?: 'free' | 'premium';
  enterpriseInvitedBy?: string;
  enterpriseAssessmentsCompleted?: Record<string, boolean>;
  assessmentScores?: {
    selfAwareness: number;
    selfRegulation: number;
    motivation: number;
    empathy: number;
    socialSkills: number;
  };
  cmmLevel?: number;
  assignments?: Array<{ id: string; title: string; completed: boolean }>;
  sessions?: Array<{ id: string; title: string; date: string; attended: boolean }>;
  introPhilosophyCompleted?: boolean;
  introTemplateCompleted?: boolean;
  introTutorialCompleted?: boolean;
  premiumPromoActive?: boolean;
  hasPremiumPromoActive?: boolean;
  hasFreeTool5Access?: boolean;
  hasAdminMasterAccess?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        setLoading(true);
        const docRef = doc(db, 'users', u.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile onSnapshot error:", error);
          setProfile(null);
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
