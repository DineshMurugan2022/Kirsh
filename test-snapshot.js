const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, onSnapshot, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBOLkbQayjt3CMdX9A_9fp9TIcDp6YFV9Q",
  authDomain: "dineshkirshvijay.firebaseapp.com",
  projectId: "dineshkirshvijay",
  storageBucket: "dineshkirshvijay.firebasestorage.app",
  messagingSenderId: "708694703565",
  appId: "1:708694703565:web:CHANGE_THIS_IF_STILL_FAILING",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  await signInWithEmailAndPassword(auth, 'testbot@example.com', 'password123');
  
  onSnapshot(collection(db, 'users'), (snap) => {
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log("Snapshot received!", list.length, "users.");
    process.exit(0);
  }, (err) => {
    console.error("Snapshot error:", err);
    process.exit(1);
  });
}

test();
