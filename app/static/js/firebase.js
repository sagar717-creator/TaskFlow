// The Firebase web config identifies the app; Security Rules protect its data.
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error('Firebase configuration is missing. Copy .env.example to .env.local and fill in your Firebase Web app values.');
}

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Initialize the named Enterprise Native database explicitly before any Firestore call.
export const firestore = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true
});
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const watchAuth = callback => onAuthStateChanged(auth, callback);
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const sendPasswordReset = email => sendPasswordResetEmail(auth, email);
export const signOutUser = () => signOut(auth);
export const saveAuthDisplayName = (user, displayName) => updateProfile(user, { displayName });

export async function readProfile(uid) {
  const snap = await getDoc(doc(firestore, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function writeProfile(user, displayName, { seedVersion } = {}) {
  const profileRef = doc(firestore, 'users', user.uid);
  const prior = await getDoc(profileRef);
  await setDoc(profileRef, {
    uid: user.uid,
    displayName,
    email: user.email || '',
    photoURL: user.photoURL || '',
    updatedAt: serverTimestamp(),
    ...(prior.exists() ? {} : { createdAt: serverTimestamp() }),
    ...(prior.exists() ? {} : { seedVersion: seedVersion ?? 0 })
  }, { merge: true });
}
