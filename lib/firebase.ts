import { initializeApp, getApps } from '@firebase/app';
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0s9ZYjr_ZRJLkv7LZt-9KhOAvGsl-WoY",
  authDomain: "masa-9ec4d.firebaseapp.com",
  projectId: "masa-9ec4d",
  storageBucket: "masa-9ec4d.firebasestorage.app",
  messagingSenderId: "353087520263",
  appId: "1:353087520263:web:904fe978ce28673715b4a2",
  measurementId: "G-4EYL82XD7X"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
