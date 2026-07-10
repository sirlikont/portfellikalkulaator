import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDbpIleEpvvsFomlrIwAIbrKHsKDRWqLGQ",
  authDomain: "portfellikalkulaator.firebaseapp.com",
  projectId: "portfellikalkulaator",
  storageBucket: "portfellikalkulaator.firebasestorage.app",
  messagingSenderId: "401478928849",
  appId: "1:401478928849:web:e63cec01a619b67d2478f0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);