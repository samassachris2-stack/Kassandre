import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function Soumettre() {
  const { user, login } = useAuth();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!question || !resolutionDate || !resolutionSource) return;
    setLoading(true);

    await addDoc(collection(db, "submissions"), {
      question,
      description,
      resolutionDate,
      resolutionSource,
      proposedBy: user.uid,
      proposedByName: user.displayName,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setQuestion("");
    setDescription("");
    setResolutionDate("");
    setResolutionSource("");
    setLoading(false);
    setSuccess(true);
  }

  if (!user) return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px", textAlign: "center" }}>
      <p style={{ marginBottom: "16px" }}>Connecte toi pour proposer un marché.</p>
      <button onClick={login} style={{ padding: "10px 24px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}>
        Connexion Google
      </button>
    </div>
  );

  if (success) return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px", textAlign: "center" }}>
      <h2 style={{ marginBottom: "12px" }}>Proposition envoyée</h2>
      <p style={{ color: "#888", marginBottom: "24px" }}>Ta question sera examinée et publiée si elle est approuvée.</p>
      <button onClick={() => setSuccess(false)} style={{ padding: "10px 24px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}>
        Proposer une autre question
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Proposer un marché</h1>
      <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>
        Ta question doit avoir une réponse objective et vérifiable.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          placeholder="Ta question (ex: Mbappé marquera-t-il avant juillet 2026 ?)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px" }}
        />
        <textarea
          placeholder="Description ou contexte (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", minHeight: "80px", fontSize: "14px" }}
        />
        <input
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px" }}
        />
        <input
          placeholder="Source de résolution (URL qui permettra de trancher)"
          value={resolutionSource}
          onChange={(e) => setResolutionSource(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !question || !resolutionDate || !resolutionSource}
          style={{
            padding: "12px",
            background: question && resolutionDate && resolutionSource ? "#000" : "#e5e7eb",
            color: question && resolutionDate && resolutionSource ? "#fff" : "#aaa",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          {loading ? "Envoi..." : "Soumettre la question"}
        </button>
      </div>
    </div>
  );
}