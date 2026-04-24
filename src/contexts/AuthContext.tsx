import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
  listingsCountToday: number;
  wishlist?: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, email: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }

      // Check if user is admin
      if (email === 'cs24mt002@iitdh.ac.in') {
        setIsAdmin(true);
      } else {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        setIsAdmin(adminSnap.exists());
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // 1. Force local persistence
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // 2. Resolve any pending redirects (Crucial for Render.com reliability)
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        console.log("Auth System: Redirect success:", result.user.email);
        if (result.user.email?.endsWith('@iitdh.ac.in')) {
          setUser(result.user);
          await fetchProfile(result.user.uid, result.user.email);
          toast.success('Successfully logged in!');
        } else {
          await auth.signOut();
          toast.error("Only @iitdh.ac.in permitted.");
        }
      }
    }).catch((error) => {
      console.error("Auth System: Redirect error:", error);
      if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        toast.error("Authentication check failed. Please check browser cookie settings.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth System: State Change", firebaseUser ? firebaseUser.email : "No User");
      
      if (firebaseUser) {
        if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid, firebaseUser.email);
        } else {
          // Force sign out if unauthorized domain somehow got through (e.g. cached session redirect)
          await auth.signOut();
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          toast.error("Please use your @iitdh.ac.in account.");
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      
      const hostname = window.location.hostname;
      // Use Redirect for Render custom domains, Popup for local/dev
      const isCustomDomain = hostname.includes('onrender.com') || 
                             (hostname !== 'localhost' && !hostname.includes('.run.app'));

      if (isCustomDomain) {
        console.log("Auth System: Using Redirect flow for reliability.");
        await signInWithRedirect(auth, googleProvider);
        // Page will redirect, execution stops here
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        if (!result.user.email?.endsWith('@iitdh.ac.in')) {
          await auth.signOut();
          toast.error('Only @iitdh.ac.in emails are allowed.');
          return;
        }
        toast.success('Successfully logged in!');
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      setLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      // Fallback: If Popup fails due to environment restrictions, try Redirect
      if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        try {
          console.log("Auth System: Popup failed, attempting redirect fallback...");
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          toast.error('Authentication blocked. Check browser privacy settings.');
        }
        return;
      }

      toast.error(`Login failed: ${error.message}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setIsAdmin(false);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const refreshProfile = async () => {
    if (user && user.email) await fetchProfile(user.uid, user.email);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signIn, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
