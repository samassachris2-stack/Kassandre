import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AppearancePanel from "../components/AppearancePanel";

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

  if (!user) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 16px" }}>
        <h1 style={{ fontSize: "22px", marginBottom: "20px" }}>Paramètres</h1>
        <AppearancePanel />
        <p style={{ color: "var(--k-faint)", fontSize: "13px", marginTop: "20px" }}>
          Connecte-toi pour modifier ton profil.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Mon profil</h1>
      <p style={{ color: "var(--k-faint)", fontSize: "14px", marginBottom: "32px" }}>
        Personnalise ton identité sur Kassandre.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <img src={user.photoURL} width={64} height={64} style={{ borderRadius: "50%", border: "2px solid var(--k-accent)" }} />
        <div>
          <p style={{ fontWeight: "600", marginBottom: "4px" }}>{user.displayName}</p>
          <p style={{ fontSize: "13px", color: "var(--k-faint)" }}>Photo via Google</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "13px", color: "var(--k-faint)", marginBottom: "6px", display: "block" }}>
            Pseudo
          </label>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={24}
            placeholder="Ton pseudo sur Kassandre"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid var(--k-border)", background: "var(--k-surface)",
              color: "var(--k-text)", fontSize: "15px", boxSizing: "border-box"
            }}
          />
          <p style={{ fontSize: "12px", color: "var(--k-border2)", marginTop: "4px" }}>{pseudo.length}/24</p>
        </div>

        <div>
          <label style={{ fontSize: "13px", color: "var(--k-faint)", marginBottom: "6px", display: "block" }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={120}
            placeholder="Une phrase sur toi..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              border: "1px solid var(--k-border)", background: "var(--k-surface)",
              color: "var(--k-text)", fontSize: "15px", minHeight: "80px",
              resize: "none", boxSizing: "border-box"
            }}
          />
          <p style={{ fontSize: "12px", color: "var(--k-border2)", marginTop: "4px" }}>{bio.length}/120</p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !pseudo.trim()}
          style={{
            padding: "12px", background: "var(--k-accent)", color: "#fff",
            borderRadius: "8px", border: "none", cursor: "pointer",
            fontWeight: "600", fontSize: "15px"
          }}
        >
          {loading ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        {success && <p style={{ color: "var(--k-accent)", textAlign: "center" }}>Profil mis à jour.</p>}

        <div style={{ border: "1px solid var(--k-border)", borderRadius: "10px", padding: "16px", background: "var(--k-surface)" }}>
          <p style={{ fontWeight: "600", marginBottom: "6px" }}>Parrainer un ami</p>
          <p style={{ fontSize: "13px", color: "var(--k-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
            Quand quelqu'un s'inscrit avec votre lien, vous recevez chacun 200 points.
            {user.referralCount > 0 && ` Déjà ${user.referralCount} filleul${user.referralCount > 1 ? "s" : ""}.`}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              readOnly
              value={`https://kassandre.app/?ref=${user.uid}`}
              onFocus={(e) => e.target.select()}
              style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--k-border)", background: "var(--k-bg)", color: "var(--k-text)", fontSize: "13px" }}
            />
            <button onClick={copyLink} style={{ padding: "9px 14px", background: "var(--k-accent)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate(`/profil/${user.uid}`)}
          style={{
            padding: "12px", background: "transparent", color: "var(--k-faint)",
            borderRadius: "8px", border: "1px solid var(--k-border)", cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Voir mon profil public
        </button>

        <AppearancePanel />
      </div>
    </div>
  );
}