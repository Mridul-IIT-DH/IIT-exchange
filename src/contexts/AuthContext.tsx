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
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      console.log("Auth System: Booting on", window.location.hostname);
      
      try {
        // 1. Resolve Persistence
        await setPersistence(auth, browserLocalPersistence);
        
        // 2. Resolve Redirect Result (Crucial for Render.com)
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          console.log("Auth System: Redirect result resolved", result.user.email);
          if (result.user.email?.endsWith('@iitdh.ac.in')) {
            setUser(result.user);
            await fetchProfile(result.user.uid, result.user.email);
            toast.success('Successfully logged in!');
          } else {
            await auth.signOut();
            toast.error("Domain @iitdh.ac.in required.");
          }
        }
      } catch (error: any) {
        console.error("Auth System: Bootstrap Error", error.code, error.message);
        if (isMounted && (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed')) {
          toast.error("Auth helper: Please ensure 'iit-exchange.onrender.com' is an Authorized Domain in Firebase.");
        }
      } finally {
        if (isMounted) {
          // 3. Setup persistent listener
          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!isMounted) return;
            console.log("Auth System: State event", firebaseUser ? firebaseUser.email : "No user");
            
            if (firebaseUser) {
              if (firebaseUser.email?.endsWith('@iitdh.ac.in')) {
                setUser(firebaseUser);
                await fetchProfile(firebaseUser.uid, firebaseUser.email);
              } else {
                await auth.signOut();
                setUser(null);
                setProfile(null);
              }
            } else {
              setUser(null);
              setProfile(null);
              setIsAdmin(false);
            }
            setLoading(false);
          });
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      
      // LOGIC: Use Redirect for custom domains (like onrender.com) to bypass 
      // strict browser cookie/opener policies.
      const hostname = window.location.hostname;
      const isCustomDomain = hostname.includes('onrender.com') || 
                             hostname.includes('render.com') ||
                             (!hostname.includes('asia-east1.run.app') && hostname !== 'localhost');

      if (isCustomDomain) {
        console.log("Auth System: Production domain detected. Forcing redirect for reliability.");
        await signInWithRedirect(auth, googleProvider);
        return;
      } else {
        console.log("Auth System: Development domain detected. Using popup.");
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
