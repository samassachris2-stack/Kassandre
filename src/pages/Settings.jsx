import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState(user?.pseudo || user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    if (!pseudo.trim()) return;
    setLoading(true);
    await updateDoc(doc(db, "users", user.uid), {
      pseudo: pseudo.trim(),
      bio: bio.trim(),
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://kassandre.app/?ref=${user.uid}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* presse-papiers indisponible */ }
  }

  if (!user) return <p style={{ padding: "40px" }}>Connecte toi d'abord.</p>;

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Mon profil</h1>
      <p style={{ color: "#6b6b8a", fontSize: "14px", marginBottom: "32px" }}>
        Personnalise ton identité sur Kassandre.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <img src={user.photoURL} width={64} height={64} style={{ borderRadius: "50%", border: "2px solid #7c3aed" }} />
        <div>
          <p style={{ fontWeight: "600", marginBottom: "4px" }}>{user.displayName}</p>
          <p style={{ fontSize: "13px", color: "#6b6b8a" }}>Photo via Google</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "6px", display: "block" }}>
            Pseudo
          </label>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={24}
            placeholder="Ton pseudo sur Kassandre"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid #2a2a3e", background: "#12121a",
              color: "#e8e8f0", fontSize: "15px", boxSizing: "border-box"
            }}
          />
          <p style={{ fontSize: "12px", color: "#4a4a5a", marginTop: "4px" }}>{pseudo.length}/24</p>
        </div>

        <div>
          <label style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "6px", display: "block" }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={120}
            placeholder="Une phrase sur toi..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid #2a2a3e", background: "#12121a",
              color: "#e8e8f0", fontSize: "15px", minHeight: "80px",
              resize: "none", boxSizing: "border-box"
            }}
          />
          <p style={{ fontSize: "12px", color: "#4a4a5a", marginTop: "4px" }}>{bio.length}/120</p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !pseudo.trim()}
          style={{
            padding: "12px", background: "#7c3aed", color: "#fff",
            borderRadius: "8px", border: "none", cursor: "pointer",
            fontWeight: "600", fontSize: "15px"
          }}
        >
          {loading ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        {success && <p style={{ color: "#7c3aed", textAlign: "center" }}>Profil mis à jour.</p>}

        <div style={{ border: "1px solid #2a2a3e", borderRadius: "10px", padding: "16px", background: "#12121a" }}>
          <p style={{ fontWeight: "600", marginBottom: "6px" }}>Parrainer un ami</p>
          <p style={{ fontSize: "13px", color: "#8888a0", marginBottom: "12px", lineHeight: 1.5 }}>
            Quand quelqu'un s'inscrit avec votre lien, vous recevez chacun 200 points.
            {user.referralCount > 0 && ` Déjà ${user.referralCount} filleul${user.referralCount > 1 ? "s" : ""}.`}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              readOnly
              value={`https://kassandre.app/?ref=${user.uid}`}
              onFocus={(e) => e.target.select()}
              style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#0a0a0f", color: "#e8e8f0", fontSize: "13px" }}
            />
            <button onClick={copyLink} style={{ padding: "9px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate(`/profil/${user.uid}`)}
          style={{
            padding: "12px", background: "transparent", color: "#6b6b8a",
            borderRadius: "8px", border: "1px solid #2a2a3e", cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Voir mon profil public
        </button>
      </div>
    </div>
  );
}