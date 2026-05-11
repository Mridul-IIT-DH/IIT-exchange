import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enterprise Connectivity: Force long polling to bypass restrictive corporate firewalls/proxies
// Use initializeFirestore once to ensure configuration is applied correctly
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

export const googleProvider = new GoogleAuthProvider();
// Pre-fill the login prompt with the correct restriction context where possible
googleProvider.setCustomParameters({
  hd: 'iitdh.ac.in',
  prompt: 'select_account'
});

// Enterprise Security: Standardized Firestore Error Reporting
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerIds: string[];
  }
}

export function handleFirestoreError(error: any, operationType: any, path: string | null = null): never {
  if (error.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'none',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerIds: auth.currentUser?.providerData.map(p => p.providerId) || [],
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

// Enterprise Integrity: Periodic Connectivity Check
import { doc, getDocFromServer } from 'firebase/firestore';
export async function testFirestoreConnection() {
  try {
    // Attempt to ping a non-existent doc to verify network/auth path
    // We use a small delay to allow initial SDK handshake
    await new Promise(resolve => setTimeout(resolve, 2000));
    await getDocFromServer(doc(db, '_internal_', 'healthcheck'));
    console.log("Firestore connection verified successfully.");
  } catch (error: any) {
    // If the error code is 'permission-denied' or 'not-found', it means the server responded.
    // This confirms connectivity, even if we don't have access to the specific healthcheck path.
    const isServerReachable = error.code === 'permission-denied' || error.code === 'not-found';

    if (isServerReachable) {
      console.log("Firestore connectivity verified (Server responded).");
      return;
    }

    if (error.message.includes('offline') || error.code === 'unavailable') {
      console.warn("Firestore: Backend currently unreachable. This is common in some restricted networks. The app will continue in offline-ready mode.");
    } else {
      console.error("Firestore connection health check failed:", error.code, error.message);
    }
  }
}

// Initialize Analytics lazily (only works in browser contexts + if not blocked)
export const analyticsPromise = isSupported().then(yes => yes ? getAnalytics(app) : null);
