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
    console.log("AuthContext: Bootstrap sequence started on domain:", window.location.hostname);
    
    let isMounted = true;
    let redirectCheckInProgress = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log("AuthContext: Setting persistence: LOCAL");
        await setPersistence(auth, browserLocalPersistence);

        // Debug info for the user
        const isRender = window.location.hostname.includes('render.com');
        if (isRender) {
          console.warn("AuthContext: Detected Render.com domain. If login fails, check for third-party cookie blocking.");
        }

        console.log("AuthContext: Checking for Redirect Result...");
        const result = await getRedirectResult(auth);
        
        if (result && isMounted) {
          console.log("AuthContext: Redirect SUCCESS. User:", result.user.email);
          const success = await handleSignInResult(result.user);
          if (success) {
            setUser(result.user);
            await fetchProfile(result.user.uid, result.user.email!);
          }
        } else if (isMounted) {
          console.log("AuthContext: No pending redirect result found.");
        }
      } catch (err: any) {
        console.error("AuthContext: Bootstrap Error (Code/Message):", err.code, "|", err.message);
        
        if (isMounted) {
          if (err.code === 'auth/network-request-failed') {
            toast.error("Network Error: Firebase cannot reach authentication servers. Verify your 'Authorized Domains'.", { duration: 6000 });
          } else if (err.code === 'auth/internal-error') {
            toast.error("Internal Auth Error: Often caused by browser extensions or missing 'Authorized Domains'.", { duration: 6000 });
          }
        }
      } finally {
        if (isMounted) {
          redirectCheckInProgress = false;
          // Only stop loading if we haven't already confirmed a user via onAuthStateChanged
          if (!auth.currentUser) {
            console.log("AuthContext: Bootstrap complete - No user found yet.");
            setLoading(false);
          } else {
            console.log("AuthContext: Bootstrap complete - User already set via listener.");
          }
        }
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: State Sync Event - User:", firebaseUser ? firebaseUser.email : "NULL");
      
      if (!isMounted) return;

      if (firebaseUser) {
        if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
          setUser(firebaseUser);
          await fetchProfile(firebaseUser.uid, firebaseUser.email);
        } else {
          console.warn("AuthContext: Non-IITDH account detected. Blocking session.");
          await auth.signOut();
          setUser(null);
          setProfile(null);
          toast.error("Please use your @iitdh.ac.in account.");
        }
      } else {
        if (!redirectCheckInProgress) {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    console.log("AuthContext: Login requested from:", window.location.hostname);
    
    // Logic: If we are on ANY domain that isn't the primary Firebase auth domain, 
    // Redirect is significantly more reliable for first-party cookie context.
    const isPrimaryDomain = window.location.hostname.includes('firebaseapp.com') || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname.includes('asia-east1.run.app');

    try {
      if (isPrimaryDomain) {
        console.log("AuthContext: Primary/Dev domain detected - Using Popup");
        const result = await signInWithPopup(auth, googleProvider);
        await handleSignInResult(result.user);
      } else {
        // ALWAYS use redirect on Render.com to bypass popup/cookie communication blocks
        console.log("AuthContext: External domain detected - Using Redirect for reliability");
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("AuthContext: Login flow error:", error.code, error.message);
      
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      // Fallback for popup failures
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/internal-error') {
        console.warn("AuthContext: Popup method blocked, falling back to Redirect...");
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      toast.error(`Login error: ${error.message}`);
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
