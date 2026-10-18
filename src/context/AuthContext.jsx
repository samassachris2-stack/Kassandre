import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";
import { callFunction } from "../lib/amm.js";
import { notify } from "../lib/notify";

const REF_KEY = "kassandre_ref";
const REF_RE = /^[A-Za-z0-9]{10,40}$/;

// Mémorise le parrain venu via ?ref=... (le navigateur peut refuser le stockage)
function captureReferral() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && REF_RE.test(ref)) localStorage.setItem(REF_KEY, ref);
  } catch { /* stockage indisponible */ }
}
captureReferral();

function pendingReferral() {
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
function clearReferral() {
  try { localStorage.removeItem(REF_KEY); } catch { /* ignoré */ }
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            avatarUrl: firebaseUser.photoURL,
            balance: 1000,
            totalBets: 0,
            createdAt: serverTimestamp(),
          });
        }
        let data = userSnap.exists() ? userSnap.data() : { balance: 1000, totalBets: 0 };

        // Parrainage : réclamé une seule fois, puis le lien mémorisé est effacé
        const ref = pendingReferral();
        if (ref) {
          try {
            const res = await callFunction("claimReferral", { referrerId: ref });
            data = (await getDoc(userRef)).data();
            notify(`Parrainage validé : +${res.bonus} points pour vous deux.`, "success");
            clearReferral();
          } catch (e) {
            // Erreur définitive (déjà utilisé, compte trop ancien...) : on arrête d'essayer
            clearReferral();
            console.warn("parrainage non appliqué", e.message);
          }
        }
        setUser({ ...firebaseUser, ...data });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);