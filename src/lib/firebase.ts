import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBHy6nT9FjtA9dsd69zZyuX_TaJnJUFaDo",
  authDomain: "iit-exchange-368e9.firebaseapp.com",
  projectId: "iit-exchange-368e9",
  storageBucket: "iit-exchange-368e9.firebasestorage.app",
  messagingSenderId: "821495445243",
  appId: "1:821495445243:web:17b8c7e89977e75833625e",
  measurementId: "G-5FTHEDWXP3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// Pre-fill the login prompt with the correct restriction context where possible
googleProvider.setCustomParameters({
  hd: 'iitdh.ac.in',
  prompt: 'select_account'
});

// Initialize Analytics lazily (only works in browser contexts + if not blocked)
export const analyticsPromise = isSupported().then(yes => yes ? getAnalytics(app) : null);
