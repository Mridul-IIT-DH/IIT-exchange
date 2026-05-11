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
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null = null): never {
  const isPermissionError = error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions');
  
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
  };

  if (isPermissionError) {
    console.error('CRITICAL: Firestore Security Violation', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('Firestore Operation Failed:', operationType, path, error);
  }

  throw new Error(JSON.stringify(errorInfo));
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
