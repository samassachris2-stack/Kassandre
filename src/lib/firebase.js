import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

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

// En local, on active le mode debug AVANT initializeAppCheck pour ne pas
// être bloqué par reCAPTCHA. Le token généré dans la console doit être
// enregistré dans Firebase Console > App Check > Manage debug tokens.
if (location.hostname === "localhost") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LenODctAAAAAOrnGlGiPmcuaAadWGSiuOPQmyNH"), // à remplacer par la clé générée dans Firebase Console > App Check
  isTokenAutoRefreshEnabled: true,
});

export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);