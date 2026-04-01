import { auth, firestore } from '@/src/firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AuthStatus = 'loading' | 'unauthenticated' | 'needsOtp' | 'blocked' | 'ready';
export const ADMIN_EMAIL = '2002dineshmurugan@gmail.com';

const isWhitelistedAdmin = (email?: string | null) =>
  (email ?? '').trim().toLowerCase() === ADMIN_EMAIL;

interface UserDoc {
  isActive: boolean;
  role: 'admin' | 'user';
  otpCode?: string;
  lastOtpVerifiedAt?: any;
  phone?: string;
  subscriptionExpiresAt?: any;
}

interface AuthContextValue {
  user: any | null;
  userDoc: UserDoc | null;
  status: AuthStatus;
  isAdmin: boolean;
  refreshing: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  markOtpVerifiedLocally: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [otpVerifiedLocally, setOtpVerifiedLocally] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sign Up logic
  const signUp = async (email: string, pass: string) => {
    const res = await auth.createUserWithEmailAndPassword(email.trim(), pass);
    if (res.user) {
      await firestore.collection('users').doc(res.user.uid).set({
        email: email.trim(),
        role: 'user',
        isActive: false, // Default to inactive until admin approves
        createdAt: new Date(),
      });
    }
  };

  const signOut = async () => {
    await auth.signOut();
    await AsyncStorage.removeItem('otp_verified');
    await AsyncStorage.removeItem('otp_verified_uid');
  };

  const markOtpVerifiedLocally = async () => {
    if (!user?.uid) return;
    await AsyncStorage.setItem('otp_verified_uid', user.uid);
    setOtpVerifiedLocally(true);
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u: any) => {
      setUser(u);
      if (!u) {
        setUserDoc(null);
        setIsAdmin(false);
        setOtpVerifiedLocally(false);
        setLoading(false);
        setRefreshing(false);
      } else {
        setIsAdmin(isWhitelistedAdmin(u.email));
        AsyncStorage.getItem('otp_verified_uid')
          .then((uid) => {
            setOtpVerifiedLocally(uid === u.uid);
          })
          .catch(() => {
            setOtpVerifiedLocally(false);
          });
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    setRefreshing(true);
    const userRef = firestore.collection('users').doc(user.uid);
    
    const unsubUser = userRef.onSnapshot(
      (snap: any) => {
        const data = snap.data() as UserDoc;
        setUserDoc(data ?? null);
        setIsAdmin(isWhitelistedAdmin(user?.email));
        setRefreshing(false);
        setLoading(false);
      },
      (error: any) => {
        console.error('Firestore Debug Error:', error);
        setRefreshing(false);
        setLoading(false);
      }
    );

    return () => unsubUser();
  }, [user]);

  const status: AuthStatus = useMemo(() => {
    if (loading || refreshing) return 'loading';
    if (!user) return 'unauthenticated';
    
    // Admins bypass everything
    if (isAdmin) return 'ready';
    
    // Users must be active
    if (userDoc?.isActive === false) return 'blocked';

    // OTP-required users must verify once per login session.
    if (userDoc?.otpCode && !otpVerifiedLocally) return 'needsOtp';
    
    return 'ready';
  }, [user, userDoc, loading, refreshing, isAdmin, otpVerifiedLocally]);

  const value = useMemo(() => ({
    user,
    userDoc,
    status,
    isAdmin,
    refreshing,
    signOut,
    signUp,
    markOtpVerifiedLocally,
  }), [user, userDoc, status, isAdmin, refreshing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
