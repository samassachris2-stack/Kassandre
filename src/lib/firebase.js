import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCvWS-jIdaldmXC92ubOTceV5E773mvYrw",
  authDomain: "kassandre-f868e.firebaseapp.com",
  projectId: "kassandre-f868e",
  storageBucket: "kassandre-f868e.firebasestorage.app",
  messagingSenderId: "576233170911",
  appId: "1:576233170911:web:2849b109d8c46d0138c66a",
  measurementId: "G-ZJ0CNPPRWG"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();