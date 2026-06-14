import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Profil() {
  const { uid } = useParams();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);

  useEffect(() => {
    async function load() {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) setUser(userSnap.data());

      const q = query(collection(db, "bets"), where("userId", "==", uid));
      const betsSnap = await getDocs(q);
      setBets(betsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [uid]);

  if (!user) return <p style={{ padding: "40px" }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <img src={user.avatarUrl} width={64} height={64} style={{ borderRadius: "50%" }} />
        <div>
          <h1 style={{ fontSize: "22px", marginBottom: "4px" }}>{user.displayName}</h1>
          <p style={{ color: "#888", fontSize: "14px" }}>{user.totalBets || 0} paris placés</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ fontSize: "24px", fontWeight: "700" }}>{user.balance}</p>
          <p style={{ fontSize: "13px", color: "#888" }}>points</p>
        </div>
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Historique des paris</h2>

      {bets.length === 0 && <p style={{ color: "#888" }}>Aucun pari pour l'instant.</p>}

      {bets.map((bet) => (
        <div key={bet.id} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          borderBottom: "1px solid #e5e7eb",
          fontSize: "14px",
        }}>
          <div>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: "20px",
              background: bet.side === "yes" ? "#dcfce7" : "#fee2e2",
              color: bet.side === "yes" ? "#16a34a" : "#dc2626",
              fontWeight: "600",
              marginRight: "10px",
              fontSize: "12px",
            }}>
              {bet.side === "yes" ? "OUI" : "NON"}
            </span>
            <span style={{ color: "#555" }}>{bet.marketId.slice(0, 12)}...</span>
          </div>
          <span style={{ fontWeight: "600" }}>{bet.amount} pts</span>
        </div>
      ))}
    </div>
  );
}