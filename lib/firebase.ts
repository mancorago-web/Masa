let db: any = null;
let waiting: Array<() => void> = [];

export function getDb() {
  if (db) return db;
  // @ts-ignore
  const firebase = globalThis.firebase;
  if (!firebase || !firebase.firestore) {
    console.warn('Firebase not loaded');
    return null;
  }
  const app = firebase.apps.length === 0
    ? firebase.initializeApp({
        apiKey: "AIzaSyD0s9ZYjr_ZRJLkv7LZt-9KhOAvGsl-WoY",
        authDomain: "masa-9ec4d.firebaseapp.com",
        projectId: "masa-9ec4d",
        storageBucket: "masa-9ec4d.firebasestorage.app",
        messagingSenderId: "353087520263",
        appId: "1:353087520263:web:904fe978ce28673715b4a2",
        measurementId: "G-4EYL82XD7X"
      })
    : firebase.apps[0];
  try {
    db = app.firestore();
  } catch {
    return null;
  }
  // Notify any waiters
  waiting.forEach(fn => fn());
  waiting = [];
  return db;
}

export function onDbReady(cb: () => void) {
  if (db) { cb(); return; }
  waiting.push(cb);
}
