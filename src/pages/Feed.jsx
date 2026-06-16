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
        <p style={{ color: "#6b6b8a" }}>Aucun marché ouvert pour l'instant.</p>
      )}

      {markets.map((market) => {
        const isMulti = market.type === "multi";
        const total = isMulti ? 0 : market.poolYes + market.poolNo;
        const pctYes = isMulti ? null : Math.round((market.poolNo / total) * 100);
        const pctNo = isMulti ? null : 100 - pctYes;

        return (
          <Link
            key={market.id}
            to={`/market/${market.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              border: "1px solid #2a2a3e",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
              cursor: "pointer",
            }}>
              <p style={{ fontWeight: "600", fontSize: "16px", marginBottom: "12px" }}>
                {market.question}
              </p>

              {!isMulti && (
                <>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ flex: pctYes, background: "#22c55e", borderRadius: "4px", height: "8px" }}/>
                    <div style={{ flex: pctNo, background: "#ef4444", borderRadius: "4px", height: "8px" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#6b6b8a" }}>
                    <span>Oui {pctYes}%</span>
                    <span>Non {pctNo}%</span>
                  </div>
                </>
              )}

              {isMulti && (
                <p style={{ fontSize: "13px", color: "#7c3aed", marginBottom: "8px" }}>
                  Multi-choix
                </p>
              )}

              <p style={{ fontSize: "12px", color: "#4a4a5a", marginTop: "8px" }}>
                Résolution : {market.resolutionDate}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}