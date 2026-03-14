import { Platform } from 'react-native';

let firebaseApp: any;
let auth: any;
let firestore: any;
let firebaseInstance: any;

if (Platform.OS === 'web') {
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } = require('firebase/auth');
  const { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, Timestamp } = require('firebase/firestore');

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

  // Firestore Compat Wrapper
  const wrapFirestore = (db: any) => ({
    collection: (path: string) => ({
      onSnapshot: (cb: any) => onSnapshot(collection(db, path), (snap: any) => {
        // Mocking the 'docs' property for FlatList
        cb({
          docs: snap.docs.map((d: any) => ({
            id: d.id,
            data: () => d.data(),
            ...d.data()
          }))
        });
      }),
      add: (data: any) => addDoc(collection(db, path), data),
      doc: (docId: string) => ({
        onSnapshot: (cb: any) => onSnapshot(doc(db, path, docId), (d: any) => {
          cb({ id: d.id, data: () => d.data(), ...d.data() });
        }),
        update: (data: any) => updateDoc(doc(db, path, docId), data),
      }),
    }),
    FieldValue: {
      serverTimestamp: () => serverTimestamp(),
    },
    Timestamp: {
      fromDate: (date: Date) => Timestamp.fromDate(date),
    }
  });

  // Auth Compat Wrapper
  const wrapAuth = (a: any) => ({
    onAuthStateChanged: (cb: any) => onAuthStateChanged(a, cb),
    signInWithEmailAndPassword: (email: string, pass: string) => signInWithEmailAndPassword(a, email, pass),
    signOut: () => signOut(a),
    get currentUser() { return a.currentUser; }
  });

  firebaseApp = rawApp;
  auth = wrapAuth(rawAuth);
  firestore = wrapFirestore(rawFirestore);
  
  firebaseInstance = {
    auth: () => auth,
    firestore: () => firestore,
  };
  // Static attachments for FieldValue etc
  (firebaseInstance.firestore as any).FieldValue = firestore.FieldValue;
  (firebaseInstance.firestore as any).Timestamp = firestore.Timestamp;

} else {
  firebaseInstance = require('@react-native-firebase/app').default;
  require('@react-native-firebase/auth');
  require('@react-native-firebase/firestore');

  firebaseApp = firebaseInstance.app();
  auth = firebaseInstance.auth();
  firestore = firebaseInstance.firestore();
}

export { firebaseApp, auth, firestore, firebaseInstance as firebase };

