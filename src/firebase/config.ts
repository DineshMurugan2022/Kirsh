import { Platform } from 'react-native';

let firebaseApp: any;
let auth: any;
let firestore: any;
let resolveServerTimestamp: () => any;
let resolveTimestampFromDate: (date: Date) => any;

if (Platform.OS === 'web') {
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');
  const { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, setDoc, serverTimestamp, Timestamp } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyBOLkbQayjt3CMdX9A_9fp9TIcDp6YFV9Q",
    authDomain: "dineshkirshvijay.firebaseapp.com",
    projectId: "dineshkirshvijay",
    storageBucket: "dineshkirshvijay.firebasestorage.app",
    messagingSenderId: "708694703565",
    appId: "1:708694703565:web:CHANGE_THIS_IF_STILL_FAILING", // Web App ID from Firebase Console
  };

  const rawApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const rawAuth = getAuth(rawApp);
  const rawFirestore = getFirestore(rawApp);

  // Firestore compat wrapper for existing app code.
  const wrapFirestore = (db: any) => ({
    collection: (path: string) => ({
      onSnapshot: (cb: any, onError?: (error: any) => void) =>
        onSnapshot(
          collection(db, path),
          (snap: any) => {
            cb({
              docs: snap.docs.map((d: any) => {
                const data = d.data() ?? {};
                return {
                  id: d.id,
                  data: () => d.data(),
                  ...data,
                };
              }),
            });
          },
          onError
        ),
      add: (data: any) => addDoc(collection(db, path), data),
      doc: (docId: string) => ({
        onSnapshot: (cb: any, onError?: (error: any) => void) =>
          onSnapshot(
            doc(db, path, docId),
            (d: any) => {
              const data = d.data() ?? {};
              cb({ id: d.id, data: () => d.data(), ...data });
            },
            onError
          ),
        update: (data: any) => updateDoc(doc(db, path, docId), data),
        set: (data: any) => setDoc(doc(db, path, docId), data),
      }),
    }),
  });

  // Auth Compat Wrapper
  const wrapAuth = (a: any) => ({
    onAuthStateChanged: (cb: any) => onAuthStateChanged(a, cb),
    signInWithEmailAndPassword: (email: string, pass: string) => signInWithEmailAndPassword(a, email, pass),
    createUserWithEmailAndPassword: (email: string, pass: string) => createUserWithEmailAndPassword(a, email, pass),
    signOut: () => signOut(a),
    get currentUser() { return a.currentUser; }
  });

  firebaseApp = rawApp;
  auth = wrapAuth(rawAuth);
  firestore = wrapFirestore(rawFirestore);
  resolveServerTimestamp = () => serverTimestamp();
  resolveTimestampFromDate = (date: Date) => Timestamp.fromDate(date);

} else {
  const appModule = require('@react-native-firebase/app').default;
  const authModule = require('@react-native-firebase/auth').default;
  const firestoreModule = require('@react-native-firebase/firestore').default;

  firebaseApp = appModule.app();
  auth = authModule();
  firestore = firestoreModule();
  resolveServerTimestamp = () => firestoreModule.FieldValue.serverTimestamp();
  resolveTimestampFromDate = (date: Date) => firestoreModule.Timestamp.fromDate(date);
}

const firebase = {
  app: () => firebaseApp,
  auth: () => auth,
  firestore: () => firestore,
};

export const serverTimestamp = () => resolveServerTimestamp();
export const timestampFromDate = (date: Date) => resolveTimestampFromDate(date);

export { firebaseApp, auth, firestore, firebase };
