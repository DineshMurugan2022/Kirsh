const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, onSnapshot } = require('firebase/firestore');

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
const rawFirestore = getFirestore(app);

const wrapFirestore = (db) => ({
  collection: (path) => ({
    onSnapshot: (cb) => onSnapshot(collection(db, path), (snap) => {
      // Mocking the 'docs' property for FlatList
      cb({
        docs: snap.docs.map((d) => ({
          id: d.id,
          data: () => d.data(),
          ...d.data()
        }))
      });
    }),
  })
});

const firestore = wrapFirestore(rawFirestore);

async function test() {
  await signInWithEmailAndPassword(auth, 'testbot@example.com', 'password123');
  
  // admin index.tsx logic
  const unsub = firestore.collection('users').onSnapshot((snap) => {
    try {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log('Final list in admin page:', list);
      process.exit(0);
    } catch (err) {
      console.error("Crash during mapping:", err);
      process.exit(1);
    }
  });
}

test();
