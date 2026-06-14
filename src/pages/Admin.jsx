import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { resolveMarket } from "../lib/amm.js";

export default function Admin() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    loadSubmissions();
    const q = query(collection(db, "markets"), where("status", "==", "open"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  async function loadSubmissions() {
    const q = query(collection(db, "submissions"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function createMarket() {
    if (!question || !resolutionDate || !resolutionSource) return;
    setLoading(true);
    await addDoc(collection(db, "markets"), {
      question, description, resolutionDate, resolutionSource,
      status: "open", outcome: null,
      poolYes: 100, poolNo: 100,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setQuestion(""); setDescription(""); setResolutionDate(""); setResolutionSource("");
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function approveSubmission(sub) {
    await addDoc(collection(db, "markets"), {
      question: sub.question,
      description: sub.description || "",
      resolutionDate: sub.resolutionDate,
      resolutionSource: sub.resolutionSource,
      status: "open", outcome: null,
      poolYes: 100, poolNo: 100,
      createdBy: sub.proposedBy,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "submissions", sub.id), { status: "approved" });
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
  }

  async function rejectSubmission(id) {
    await updateDoc(doc(db, "submissions", id), { status: "rejected" });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleResolve(marketId, outcome) {
    if (!confirm(`Résoudre ce marché avec outcome : ${outcome} ?`)) return;
    try {
      await resolveMarket(marketId, outcome);
      alert("Marché résolu et gains distribués.");
    } catch (e) {
      alert(e.message);
    }
  }

  if (!user) return <p style={{ padding: "40px" }}>Connecte toi d'abord.</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "32px" }}>Admin</h1>

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Créer un marché</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
        <input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
        <textarea placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", minHeight: "80px" }} />
        <input type="date" value={resolutionDate} onChange={(e) => setResolutionDate(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
        <input placeholder="Source de résolution" value={resolutionSource} onChange={(e) => setResolutionSource(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
        <button onClick={createMarket} disabled={loading}
          style={{ padding: "12px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
          {loading ? "Création..." : "Créer le marché"}
        </button>
        {success && <p style={{ color: "green" }}>Marché créé.</p>}
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>
        Marchés ouverts ({markets.length})
      </h2>
      {markets.length === 0 && <p style={{ color: "#888", marginBottom: "32px" }}>Aucun marché ouvert.</p>}
      {markets.map((market) => (
        <div key={market.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontWeight: "600", marginBottom: "12px" }}>{market.question}</p>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Résolution : {market.resolutionDate}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => handleResolve(market.id, "yes")}
              style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Résoudre : Oui
            </button>
            <button onClick={() => handleResolve(market.id, "no")}
              style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Résoudre : Non
            </button>
          </div>
        </div>
      ))}

      <h2 style={{ fontSize: "18px", marginBottom: "16px", marginTop: "32px" }}>
        Soumissions en attente ({submissions.length})
      </h2>
      {submissions.length === 0 && <p style={{ color: "#888" }}>Aucune soumission en attente.</p>}
      {submissions.map((sub) => (
        <div key={sub.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontWeight: "600", marginBottom: "8px" }}>{sub.question}</p>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>Par : {sub.proposedByName}</p>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>Résolution : {sub.resolutionDate}</p>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Source : {sub.resolutionSource}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => approveSubmission(sub)}
              style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Approuver
            </button>
            <button onClick={() => rejectSubmission(sub.id)}
              style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}