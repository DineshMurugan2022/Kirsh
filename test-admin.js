const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, onSnapshot } = require('firebase/firestore');

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
  try {
    let creds;
    try {
      creds = await signInWithEmailAndPassword(auth, 'testbot@example.com', 'password123');
    } catch (e) {
      creds = await createUserWithEmailAndPassword(auth, 'testbot@example.com', 'password123');
    }
    console.log("Logged in as:", creds.user.email);
    
    // Test fetching users collection
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Firebase Users Collection:', users);
    
    process.exit(0);
  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

test();
