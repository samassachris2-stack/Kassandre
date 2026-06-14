import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      orderBy("balance", "desc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Classement</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>
        Les meilleurs prévisionnistes de Kassandre.
      </p>

      {users.map((user, index) => (
        <Link
          key={user.id}
          to={`/profil/${user.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "16px",
            borderBottom: "1px solid #e5e7eb",
            cursor: "pointer",
          }}>
            <span style={{
              fontSize: "18px",
              fontWeight: "700",
              width: "32px",
              color: index === 0 ? "#f59e0b" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "#000",
            }}>
              {index + 1}
            </span>
            <img
              src={user.avatarUrl}
              width={40}
              height={40}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "600", marginBottom: "2px" }}>{user.displayName}</p>
              <p style={{ fontSize: "13px", color: "#888" }}>{user.totalBets || 0} paris</p>
            </div>
            <span style={{ fontWeight: "700", fontSize: "16px" }}>
              {user.balance} pts
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}