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
    // Log in as testbot to satisfy auth rules so we can write
    await signInWithEmailAndPassword(auth, 'testbot@example.com', 'password123');

    // Make the user an admin
    await setDoc(doc(db, 'users', 'OQl2xccVDiRUk1oBIX6XdRHvIY83'), {
      email: '2002dineshmurugan@gmail.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    });
    
    console.log("Admin successfully written!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
