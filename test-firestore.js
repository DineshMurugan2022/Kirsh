const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyBOLkbQayjt3CMdX9A_9fp9TIcDp6YFV9Q",
  authDomain: "dineshkirshvijay.firebaseapp.com",
  projectId: "dineshkirshvijay",
  storageBucket: "dineshkirshvijay.firebasestorage.app",
  messagingSenderId: "708694703565",
  appId: "1:708694703565:web:CHANGE_THIS_IF_STILL_FAILING",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Users:', users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
  }
}

test();
