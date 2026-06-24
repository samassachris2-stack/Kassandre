import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { resolveMarket } from "../lib/amm.js";

function MultiResolveButtons({ marketId }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function load() {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      const snap = await getDocs(collection(db, "markets", marketId, "options"));
      setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [marketId]);

  async function handleResolve(optionId, label) {
    if (!confirm(`Résoudre avec "${label}" comme gagnant ?`)) return;
    try {
      await resolveMarket(marketId, optionId);
      alert("Marché résolu et gains distribués.");
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => handleResolve(opt.id, opt.label)}
          style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
        >
          Résoudre : {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [marketType, setMarketType] = useState("binary");
  const [options, setOptions] = useState(["", ""]);
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

    if (marketType === "binary") {
      await addDoc(collection(db, "markets"), {
        question, description, resolutionDate, resolutionSource,
        type: "binary",
        status: "open", outcome: null,
        poolYes: 100, poolNo: 100,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } else {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        alert("Ajoute au moins 2 options.");
        setLoading(false);
        return;
      }
      const liquidityB = Math.round(75 * Math.log(validOptions.length + 1));
      const marketRef = await addDoc(collection(db, "markets"), {
        question, description, resolutionDate, resolutionSource,
        type: "multi",
        status: "open", outcome: null,
        liquidityB,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      const equalPrice = 1 / validOptions.length;
      for (const label of validOptions) {
        await setDoc(doc(db, "markets", marketRef.id, "options", label.toLowerCase().replace(/\s+/g, "_")), {
          label,
          q: 0,
          price: equalPrice,
          createdAt: serverTimestamp(),
        });
      }
    }

    setQuestion("");
    setDescription("");
    setResolutionDate("");
    setResolutionSource("");
    setOptions(["", ""]);
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
      type: "binary",
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

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={() => setMarketType("binary")}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: marketType === "binary" ? "#7c3aed" : "#1a1a2e",
            color: "#e8e8f0", fontWeight: "600"
          }}
        >
          Oui / Non
        </button>
        <button
          onClick={() => setMarketType("multi")}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: marketType === "multi" ? "#7c3aed" : "#1a1a2e",
            color: "#e8e8f0", fontWeight: "600"
          }}
        >
          Multi-choix
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
        <input
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />
        <textarea
          placeholder="Description (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0", minHeight: "80px" }}
        />
        <input
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />
        <input
          placeholder="Source de résolution"
          value={resolutionSource}
          onChange={(e) => setResolutionSource(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
        />

        {marketType === "multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "13px", color: "#6b6b8a" }}>Options</p>
            {options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0" }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setOptions([...options, ""])}
              style={{ padding: "8px", background: "#1a1a2e", color: "#7c3aed", borderRadius: "8px", border: "1px solid #7c3aed", cursor: "pointer" }}
            >
              + Ajouter une option
            </button>
          </div>
        )}

        <button
          onClick={createMarket}
          disabled={loading}
          style={{ padding: "12px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
        >
          {loading ? "Création..." : "Créer le marché"}
        </button>
        {success && <p style={{ color: "#7c3aed" }}>Marché créé.</p>}
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Marchés ouverts ({markets.length})</h2>
      {markets.map((market) => (
        <div key={market.id} style={{ border: "1px solid #2a2a3e", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontWeight: "600", marginBottom: "4px" }}>{market.question}</p>
          <p style={{ fontSize: "12px", color: "#6b6b8a", marginBottom: "12px" }}>
            {market.type === "multi" ? "Multi-choix" : "Oui/Non"} · Résolution : {market.resolutionDate}
          </p>
          {market.type === "binary" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleResolve(market.id, "yes")}
                style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Résoudre : Oui
              </button>
              <button
                onClick={() => handleResolve(market.id, "no")}
                style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Résoudre : Non
              </button>
            </div>
          )}
          {market.type === "multi" && (
  <MultiResolveButtons marketId={market.id} />
)}
        </div>
      ))}

      <h2 style={{ fontSize: "18px", marginBottom: "16px", marginTop: "32px" }}>
        Soumissions en attente ({submissions.length})
      </h2>
      {submissions.length === 0 && (
        <p style={{ color: "#6b6b8a" }}>Aucune soumission en attente.</p>
      )}
      {submissions.map((sub) => (
        <div key={sub.id} style={{ border: "1px solid #2a2a3e", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <p style={{ fontWeight: "600", marginBottom: "8px" }}>{sub.question}</p>
          <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "4px" }}>Par : {sub.proposedByName}</p>
          <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "16px" }}>Résolution : {sub.resolutionDate}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => approveSubmission(sub)}
              style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              Approuver
            </button>
            <button
              onClick={() => rejectSubmission(sub.id)}
              style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
            >
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}