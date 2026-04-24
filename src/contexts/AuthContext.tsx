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

      // Admin check
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
    // 1. Force local persistence to ensure Render.com handles sessions correctly
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // 2. Resolve any pending redirects (Crucial for Render.com reliability)
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        console.log("Redirect login success:", result.user.email);
        if (result.user.email?.endsWith('@iitdh.ac.in')) {
          setUser(result.user);
          await fetchProfile(result.user.uid, result.user.email);
          toast.success('Successfully logged in via redirect!');
        } else {
          await auth.signOut();
          toast.error("Only @iitdh.ac.in permitted.");
        }
      }
    }).catch((error) => {
      console.error("Redirect resolution error:", error);
      if (error.code !== 'auth/network-request-failed') {
        // Only show if it's not a generic networking glitch
        toast.error("Authentication interrupted. Please try again.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email || "No user");
      if (firebaseUser) {
        if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid, firebaseUser.email);
        } else {
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
      
      // LOGIC: Use Redirect for custom Render domains to bypass 3rd-party cookie blocking.
      // Use Popup for development domains for speed.
      const isCustomDomain = window.location.hostname.includes('render.com') || 
                             !window.location.hostname.includes('asia-east1.run.app') && 
                             window.location.hostname !== 'localhost';

      if (isCustomDomain) {
        console.log("Using Redirect flow for production reliability.");
        await signInWithRedirect(auth, googleProvider);
        // Page will redirect, no code below this will execute
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
      console.error("Login error:", error);
      setLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user') return;
      
      // Fallback: If Popup fails, attempt Redirect automatically
      if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        try {
          console.log("Popup blocked or failed, attempting redirect fallback...");
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          toast.error('Authentication system blocked. Please check your browser cookie settings.');
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
