const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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
    await signInWithEmailAndPassword(auth, 'testbot@example.com', 'password123');
    await setDoc(doc(db, 'users', 'dummy-unapproved-friend'), {
      email: 'waitingfriend_demo@gmail.com',
      role: 'user',
      isActive: false,
      createdAt: new Date()
    });
    console.log("Dummy unapproved friend inserted!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
