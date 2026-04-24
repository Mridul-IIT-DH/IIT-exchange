import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  getRedirectResult,
  signInWithRedirect
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
      console.log(`AuthContext: Fetching profile for ${uid}`);
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("AuthContext: Profile found", docSnap.data());
        setProfile(docSnap.data() as UserProfile);
      } else {
        console.log("AuthContext: No profile found, redirecting to setup soon");
        setProfile(null);
      }

      // Check if user is admin
      // Priority 1: User email cs24mt002@iitdh.ac.in
      if (email === 'cs24mt002@iitdh.ac.in') {
        setIsAdmin(true);
      } else {
        // Fallback: Check admins collection
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
    console.log("AuthContext: Initializing Auth System...");
    
    // Explicitly set persistence to local to ensure Render.com handles sessions correctly
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log("AuthContext: Persistence set to local"))
      .catch(err => console.error("AuthContext: Persistence error", err));

    // Handle results from redirects (for mobile/safari fallback)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("AuthContext: Redirect login success", result.user.email);
          if (!result.user.email?.endsWith('@iitdh.ac.in')) {
            signOut(auth);
            toast.error("Only @iitdh.ac.in allowed");
          }
        }
      })
      .catch(err => console.error("AuthContext: Redirect error", err));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged event triggered", {
        hasUser: !!firebaseUser,
        email: firebaseUser?.email,
        isVerified: firebaseUser?.emailVerified
      });

      if (firebaseUser) {
        // Enforce IITDH domain logic even on re-auth strictly
        if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid, firebaseUser.email);
        } else {
          console.warn("AuthContext: Non-IITDH email detected, signing out", firebaseUser.email);
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

    return unsubscribe;
  }, []);

  const signIn = async () => {
    console.log("AuthContext: Initiating login flow...");
    
    // Check if we are in a potentially problematic environment (like a deep iframe or restrictive mobile browser)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIframe = window.self !== window.top;

    try {
      // If we are in an iframe (AI Studio preview) or mobile, popups are often blocked or fail to communicate.
      if (isIframe && !isMobile) {
        console.log("AuthContext: Using Popup mode (Desktop Iframe Environment)");
        const result = await signInWithPopup(auth, googleProvider);
        handleSignInResult(result.user);
      } else {
        // For mobile or direct production domain, Redirect is often more reliable for Render + Firebase communication
        console.log("AuthContext: Using Redirect mode (Reliability Fallback)");
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("AuthContext: Login flow failure", error);
      
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      // Fallback: If Popup fails (common with 3rd party cookie block), try Redirect
      if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        console.warn("AuthContext: Primary method failed, attempting redirect fallback...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          toast.error("Critical: Auth system blocked. Please refresh or check your browser cookie settings.");
        }
        return;
      }

      toast.error(`Login failed: ${error.message || 'Check your internet connection'}`);
    }
  };

  const handleSignInResult = async (firebaseUser: User) => {
    console.log("AuthContext: Handling sign-in result", firebaseUser.email);
    if (!firebaseUser.email?.endsWith('@iitdh.ac.in')) {
      console.warn("AuthContext: Domain restriction active");
      await auth.signOut();
      toast.error('Only @iitdh.ac.in emails are allowed.');
      return;
    }
    toast.success('Successfully logged in!');
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setIsAdmin(false);
    toast.success('Logged out successfully');
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
