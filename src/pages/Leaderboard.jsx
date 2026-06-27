import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";

const CATEGORIES = ["Sport", "Économie", "Politique", "Tech", "Culture"];

const TABS = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "Hebdo" },
  { id: "monthly", label: "Mensuel" },
  { id: "category", label: "Par catégorie" },
];

// Classement triable selon l'onglet actif. Les champs balanceSnapshotWeekly /
// balanceSnapshotMonthly / categoryStats n'existent pas encore côté Firestore
// (à brancher via la Cloud Function de résolution + le cron de snapshot) —
// le composant tombe sur des valeurs par défaut sûres en attendant.
function getSortValue(user, tab, category) {
  if (tab === "global") return user.balance ?? 0;
  if (tab === "weekly") return (user.balance ?? 0) - (user.balanceSnapshotWeekly ?? user.balance ?? 0);
  if (tab === "monthly") return (user.balance ?? 0) - (user.balanceSnapshotMonthly ?? user.balance ?? 0);
  if (tab === "category") {
    const stats = user.categoryStats?.[category];
    if (!stats || !stats.resolved) return -1;
    return stats.wins / stats.resolved;
  }
  return 0;
}

function getAccuracy(user) {
  const resolved = user.totalResolvedBets ?? 0;
  const wins = user.totalWins ?? 0;
  if (resolved === 0) return null;
  return Math.round((wins / resolved) * 100);
}

function formatSignedPoints(value) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} pts`;
}

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("global");
  const [category, setCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("balance", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users]
      .map((u) => ({ ...u, _sortValue: getSortValue(u, tab, category) }))
      .filter((u) => tab !== "category" || u._sortValue >= 0)
      .sort((a, b) => b._sortValue - a._sortValue)
      .slice(0, 50);
  }, [users, tab, category]);

  return (
    <div style={{ maxWidth: "640px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#e8e8f0" }}>Classement</h1>
      <p style={{ color: "#8888a0", fontSize: "14px", marginBottom: "24px" }}>
        Les meilleurs prévisionnistes de Kassandre.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: tab === t.id ? "1px solid #7c3aed" : "1px solid #2a2a3e",
              background: tab === t.id ? "rgba(124,58,237,0.15)" : "transparent",
              color: tab === t.id ? "#a78bfa" : "#8888a0",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "category" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: category === cat ? "1px solid #7c3aed" : "1px solid #2a2a3e",
                background: category === cat ? "#7c3aed" : "transparent",
                color: category === cat ? "#fff" : "#8888a0",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p style={{ color: "#6b6b8a", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
          Chargement du classement...
        </p>
      )}

      {!loading && sortedUsers.length === 0 && (
        <p style={{ color: "#6b6b8a", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
          {tab === "category"
            ? `Personne n'a encore de pari résolu en ${category}.`
            : "Aucun classement disponible pour le moment."}
        </p>
      )}

      {sortedUsers.map((user, index) => {
        const accuracy = getAccuracy(user);
        return (
          <Link
            key={user.id}
            to={`/profil/${user.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "14px 12px",
              borderBottom: "1px solid #1e1e2e",
              cursor: "pointer",
              borderRadius: "8px",
              transition: "background 0.15s",
            }}>
              <span style={{
                fontSize: "16px",
                fontWeight: "700",
                width: "28px",
                textAlign: "center",
                color: index === 0 ? "#f59e0b" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "#6b6b8a",
              }}>
                {index + 1}
              </span>
              <img
                src={user.avatarUrl}
                width={36}
                height={36}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #2a2a3e" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: "600", marginBottom: "2px", color: "#e8e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.displayName}
                </p>
                <p style={{ fontSize: "12px", color: "#6b6b8a" }}>
                  {user.totalBets || 0} paris
                  {accuracy !== null && ` · ${accuracy}% de précision`}
                </p>
              </div>
              <span style={{
                fontWeight: "700",
                fontSize: "15px",
                color: tab === "global" ? "#e8e8f0" : tab === "category" ? "#a78bfa" : (user._sortValue >= 0 ? "#22c55e" : "#ef4444"),
                flexShrink: 0,
                textAlign: "right",
              }}>
                {tab === "global" && `${Math.round(user.balance ?? 0)} pts`}
                {(tab === "weekly" || tab === "monthly") && formatSignedPoints(user._sortValue)}
                {tab === "category" && `${Math.round(user._sortValue * 100)}%`}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}