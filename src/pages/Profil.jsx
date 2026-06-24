import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

const S = {
  page: {
    maxWidth: "640px",
    margin: "40px auto",
    padding: "0 16px",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "28px",
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "0.5px solid rgba(124,58,237,0.3)",
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: "-2px",
    right: "-2px",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#7c3aed",
    border: "2px solid #0a0a0f",
    color: "#fff",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  identityBlock: { flex: 1, minWidth: 0 },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  displayName: {
    fontSize: "21px",
    fontWeight: "600",
    color: "#e8e8f0",
    margin: 0,
  },
  editIconBtn: {
    background: "transparent",
    border: "none",
    color: "#8888a0",
    cursor: "pointer",
    fontSize: "13px",
    padding: "2px 6px",
    borderRadius: "6px",
  },
  betsCount: {
    color: "#8888a0",
    fontSize: "13px",
    margin: 0,
  },
  bioText: {
    color: "#a8a8b8",
    fontSize: "13px",
    marginTop: "6px",
    lineHeight: "1.4",
  },
  balanceBlock: {
    marginLeft: "auto",
    textAlign: "right",
    flexShrink: 0,
  },
  balanceValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#a78bfa",
    margin: 0,
  },
  balanceLabel: {
    fontSize: "12px",
    color: "#8888a0",
    margin: 0,
  },
  editPanel: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.2)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
  },
  fieldLabel: {
    fontSize: "11px",
    color: "#8888a0",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "5px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.2)",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "12px",
  },
  textarea: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.2)",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "12px",
    resize: "vertical",
    minHeight: "60px",
    fontFamily: "inherit",
  },
  editActions: { display: "flex", gap: "8px" },
  saveBtn: {
    flex: 1, padding: "9px", borderRadius: "8px", border: "none",
    background: "#7c3aed", color: "#fff", fontWeight: "600",
    cursor: "pointer", fontSize: "13px",
  },
  cancelBtn: {
    flex: 1, padding: "9px", borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.2)", background: "transparent",
    color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "13px",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#e8e8f0",
    marginBottom: "14px",
    marginTop: "8px",
  },
  emptyText: { color: "#8888a0", fontSize: "13px" },
  posCard: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  posLabel: { fontSize: "13px", fontWeight: "500", color: "#e8e8f0" },
  posSub: { fontSize: "11px", color: "#8888a0", marginTop: "2px" },
  posShares: { fontSize: "14px", fontWeight: "600", color: "#a78bfa", flexShrink: 0 },
  betRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "0.5px solid rgba(124,58,237,0.1)",
    fontSize: "13px",
  },
  betBadgeYes: {
    display: "inline-block", padding: "2px 9px", borderRadius: "6px",
    background: "rgba(34,197,94,0.12)", color: "#22c55e",
    fontWeight: "600", marginRight: "8px", fontSize: "11px",
  },
  betBadgeNo: {
    display: "inline-block", padding: "2px 9px", borderRadius: "6px",
    background: "rgba(239,68,68,0.12)", color: "#ef4444",
    fontWeight: "600", marginRight: "8px", fontSize: "11px",
  },
  betBadgeSell: {
    display: "inline-block", padding: "2px 9px", borderRadius: "6px",
    background: "rgba(124,58,237,0.12)", color: "#a78bfa",
    fontWeight: "600", marginRight: "8px", fontSize: "11px",
  },
  betLabelText: { color: "#a8a8b8" },
  betAmount: { fontWeight: "600", color: "#e8e8f0" },
};

export default function Profil() {
  const { uid } = useParams();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.uid === uid;

  const [profile, setProfile] = useState(null);
  const [bets, setBets] = useState([]);
  const [positions, setPositions] = useState([]);
  const [marketTitles, setMarketTitles] = useState({});

  const [editing, setEditing] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfile(data);
        setPseudo(data.pseudo || data.displayName || "");
        setBio(data.bio || "");
      }

      const betsQ = query(
        collection(db, "bets"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      const betsSnap = await getDocs(betsQ);
      const betsList = betsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBets(betsList);

      if (isOwnProfile) {
        const posQ = query(collection(db, "positions"), where("userId", "==", uid));
        const posSnap = await getDocs(posQ);
        const posList = posSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.shares > 0.01);
        setPositions(posList);

        const marketIds = [...new Set([...betsList, ...posList].map((x) => x.marketId))];
        const titles = {};
        await Promise.all(marketIds.map(async (mid) => {
          const mSnap = await getDoc(doc(db, "markets", mid));
          if (mSnap.exists()) titles[mid] = mSnap.data().question;
        }));
        setMarketTitles(titles);
      } else {
        const marketIds = [...new Set(betsList.map((b) => b.marketId))];
        const titles = {};
        await Promise.all(marketIds.map(async (mid) => {
          const mSnap = await getDoc(doc(db, "markets", mid));
          if (mSnap.exists()) titles[mid] = mSnap.data().question;
        }));
        setMarketTitles(titles);
      }
    }
    load();
  }, [uid, isOwnProfile]);

  async function handleSave() {
    if (!pseudo.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        pseudo: pseudo.trim(),
        bio: bio.trim().slice(0, 160),
      });
      setProfile((prev) => ({ ...prev, pseudo: pseudo.trim(), bio: bio.trim().slice(0, 160) }));
      setEditing(false);
    } catch (e) {
      alert("Erreur lors de la sauvegarde : " + e.message);
    }
    setSaving(false);
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image doit faire moins de 5 Mo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Le fichier doit être une image.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const avatarRef = ref(storage, `avatars/${uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      await updateDoc(doc(db, "users", uid), { avatarUrl: url });
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
    } catch (e) {
      alert("Erreur lors de l'upload : " + e.message);
    }
    setUploadingAvatar(false);
  }

  if (!profile) return <p style={{ padding: "40px", color: "#8888a0" }}>Chargement...</p>;

  const displayName = profile.pseudo || profile.displayName || "Utilisateur";

  return (
    <div style={S.page}>

      <div style={S.header}>
        <div style={S.avatarWrap}>
          <img src={profile.avatarUrl} alt={displayName} style={S.avatar} />
          {isOwnProfile && (
            <>
              <button
                style={S.avatarEditBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Changer l'avatar"
              >
                {uploadingAvatar ? "…" : "✎"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>

        <div style={S.identityBlock}>
          <div style={S.nameRow}>
            <h1 style={S.displayName}>{displayName}</h1>
            {isOwnProfile && !editing && (
              <button style={S.editIconBtn} onClick={() => setEditing(true)}>Modifier</button>
            )}
          </div>
          <p style={S.betsCount}>{profile.totalBets || 0} paris placés</p>
          {profile.bio && !editing && <p style={S.bioText}>{profile.bio}</p>}
        </div>

        <div style={S.balanceBlock}>
          <p style={S.balanceValue}>{Number(profile.balance).toFixed(2)}</p>
          <p style={S.balanceLabel}>points</p>
        </div>
      </div>

      {isOwnProfile && editing && (
        <div style={S.editPanel}>
          <label style={S.fieldLabel}>Pseudo</label>
          <input
            style={S.input}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 24))}
            placeholder="Ton pseudo"
            maxLength={24}
          />
          <label style={S.fieldLabel}>Bio</label>
          <textarea
            style={S.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Une courte description (160 caractères max)"
            maxLength={160}
          />
          <div style={S.editActions}>
            <button style={S.cancelBtn} onClick={() => {
              setEditing(false);
              setPseudo(profile.pseudo || profile.displayName || "");
              setBio(profile.bio || "");
            }}>Annuler</button>
            <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {isOwnProfile && (
        <>
          <h2 style={S.sectionTitle}>Positions ouvertes</h2>
          {positions.length === 0 && <p style={S.emptyText}>Aucune position ouverte pour l'instant.</p>}
          {positions.map((pos) => {
            const label = pos.type === "multi"
              ? (pos.optionId || "").replace(/_/g, " ")
              : (pos.side === "yes" ? "OUI" : "NON");
            return (
              <div key={pos.id} style={S.posCard}>
                <div>
                  <p style={S.posLabel}>{marketTitles[pos.marketId] || "Marché"}</p>
                  <p style={S.posSub}>{label}</p>
                </div>
                <span style={S.posShares}>{pos.shares.toFixed(2)} parts</span>
              </div>
            );
          })}
        </>
      )}

      <h2 style={S.sectionTitle}>Historique des paris</h2>
      {bets.length === 0 && <p style={S.emptyText}>Aucun pari pour l'instant.</p>}
      {bets.map((bet) => {
        const isSell = bet.type === "sell";
        const isMulti = bet.type === "multi" || (bet.optionId && !isSell);
        let badge, badgeStyle;
        if (isSell) {
          badge = "VENTE";
          badgeStyle = S.betBadgeSell;
        } else if (isMulti) {
          badge = (bet.optionId || "").replace(/_/g, " ");
          badgeStyle = S.betBadgeSell;
        } else {
          badge = bet.side === "yes" ? "OUI" : "NON";
          badgeStyle = bet.side === "yes" ? S.betBadgeYes : S.betBadgeNo;
        }
        return (
          <div key={bet.id} style={S.betRow}>
            <div>
              <span style={badgeStyle}>{badge}</span>
              <span style={S.betLabelText}>{marketTitles[bet.marketId] || "Marché"}</span>
            </div>
            <span style={S.betAmount}>
              {isSell ? `+${Math.abs(bet.amount).toFixed(2)}` : bet.amount} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}