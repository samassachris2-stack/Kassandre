import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";

export default function Feed() {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "markets"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsubscribe;
  }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "24px" }}>Marchés ouverts</h1>

      {markets.length === 0 && (
        <p style={{ color: "#888" }}>Aucun marché ouvert pour l'instant.</p>
      )}

      {markets.map((market) => {
        const total = market.poolYes + market.poolNo;
        const pctYes = Math.round((market.poolNo / total) * 100);
        const pctNo = 100 - pctYes;

        return (
          <Link
            key={market.id}
            to={`/market/${market.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
              cursor: "pointer",
            }}>
              <p style={{ fontWeight: "600", fontSize: "16px", marginBottom: "12px" }}>
                {market.question}
              </p>

              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <div style={{
                  flex: pctYes,
                  background: "#22c55e",
                  borderRadius: "4px",
                  height: "8px",
                }}/>
                <div style={{
                  flex: pctNo,
                  background: "#ef4444",
                  borderRadius: "4px",
                  height: "8px",
                }}/>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#555" }}>
                <span>Oui {pctYes}%</span>
                <span>Non {pctNo}%</span>
              </div>

              <p style={{ fontSize: "12px", color: "#aaa", marginTop: "8px" }}>
                Résolution : {market.resolutionDate}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}