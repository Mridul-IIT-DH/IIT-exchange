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

  const handleSignInResult = async (firebaseUser: User) => {
    console.log("AuthContext: Processing user result for", firebaseUser.email);
    
    if (!firebaseUser.email?.endsWith('@iitdh.ac.in')) {
      console.warn("AuthContext: Unauthorized domain blocked:", firebaseUser.email);
      await auth.signOut();
      toast.error('Access restricted to @iitdh.ac.in accounts.');
      setUser(null);
      setProfile(null);
      return false;
    }
    
    console.log("AuthContext: Domain verified successfully");
    toast.success('Successfully logged in!');
    return true;
  };

  useEffect(() => {
    console.log("AuthContext: Initializing Auth System...");
    
    // Explicitly set persistence to local for consistent behavior across domains
    setPersistence(auth, browserLocalPersistence)
      .catch(err => console.error("AuthContext: Persistence setup failed", err));

    // Handle results from redirects (crucial for reliability on mobile/external domains)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log("AuthContext: Login detected from redirect result");
          await handleSignInResult(result.user);
        }
      })
      .catch((err) => {
        console.error("AuthContext: Error recovering from redirect", err);
        // On connection failures or iframe blocks, we show a helpful hint
        if (err.code === 'auth/internal-error' || err.code === 'auth/network-request-failed') {
          toast.error("Security block detected. Please ensure cookies are allowed and cross-site tracking is not blocked for this site.", { duration: 6000 });
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: Auth status change:", firebaseUser ? "Authenticated" : "Not Authenticated");
      
      if (firebaseUser) {
        if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid, firebaseUser.email);
        } else {
          console.warn("AuthContext: Domain violation in state, signing out");
          await auth.signOut();
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
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
    console.log("AuthContext: Starting login flow...");
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIframe = window.self !== window.top;

    try {
      if (isIframe && !isMobile) {
        // Desktop Iframes (AI Studio preview) usually handle popups better if cookies are OK
        console.log("AuthContext: Mode = Popup");
        const result = await signInWithPopup(auth, googleProvider);
        await handleSignInResult(result.user);
      } else {
        // Mobile or direct Render.com usage often requires redirects due to Safari/Mobile Chrome restrictions
        console.log("AuthContext: Mode = Redirect (Session Reliability)");
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("AuthContext: Login error details", error);
      
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        console.warn("AuthContext: Popup blocked or connectivity issue, falling back to redirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          toast.error("Auth system blocked by browser tracking protection. Please open in a new tab or adjust cookie settings.");
        }
        return;
      }

      toast.error(`Login failed: ${error.message || 'Please check your connection'}`);
    }
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
