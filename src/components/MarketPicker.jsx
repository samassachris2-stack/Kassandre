import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { normalize } from "../lib/blogUtils";

const MAX = 3;

// Choix des marchés liés à un article (3 au maximum). `value` est la liste
// d'identifiants séparés par des virgules, comme stockée dans le formulaire.
export default function MarketPicker({ value, onChange }) {
  const ids = useMemo(
    () => String(value || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, MAX),
    [value]
  );
  const [markets, setMarkets] = useState(null);
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState("");

  // Marchés ouverts, chargés une fois (la lecture des marchés est publique).
  useEffect(() => {
    let alive = true;
    getDocs(query(collection(db, "markets"), where("status", "==", "open")))
      .then((snap) => {
        if (alive) setMarkets(snap.docs.map((d) => ({ id: d.id, question: d.data().question || "", type: d.data().type })));
      })
      .catch(() => { if (alive) setMarkets([]); });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map((markets || []).map((m) => [m.id, m])), [markets]);
  const full = ids.length >= MAX;

  const emit = (list) => onChange(list.slice(0, MAX).join(", "));
  const add = (id) => { if (id && !ids.includes(id) && ids.length < MAX) emit([...ids, id]); };
  const remove = (id) => emit(ids.filter((x) => x !== id));
  const move = (id, dir) => {
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    emit(next);
  };

  const results = useMemo(() => {
    const needle = normalize(search).trim();
    if (!needle || !markets) return [];
    const words = needle.split(/\s+/);
    return markets
      .filter((m) => !ids.includes(m.id) && words.every((w) => normalize(m.question).includes(w)))
      .slice(0, 8);
  }, [search, markets, ids]);

  const addManual = () => {
    const found = manual.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const next = [...ids];
    found.forEach((id) => { if (!next.includes(id) && next.length < MAX) next.push(id); });
    emit(next);
    setManual("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "0.85rem", color: "#8888a0" }}>
        {ids.length} / {MAX} marchés liés. Ils s'affichent sous l'article, dans l'ordre ci-dessous.
      </div>

      {ids.map((id, i) => {
        const m = byId.get(id);
        const unknown = markets && !m;
        return (
          <div key={id} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px",
            background: "#0a0a0f", border: `1px solid ${unknown ? "#f59e0b" : "#2a2a35"}`,
          }}>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#e8e8f0", fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m ? m.question : unknown ? "Marché introuvable ou déjà fermé" : "Chargement..."}
              </div>
              <div style={{ color: "#8888a0", fontSize: "0.75rem", wordBreak: "break-all" }}>{id}</div>
            </div>
            <button type="button" onClick={() => move(id, -1)} disabled={i === 0} style={btn} aria-label="Monter">↑</button>
            <button type="button" onClick={() => move(id, 1)} disabled={i === ids.length - 1} style={btn} aria-label="Descendre">↓</button>
            <button type="button" onClick={() => remove(id)} style={{ ...btn, color: "#ef4444" }} aria-label="Retirer">✕</button>
          </div>
        );
      })}

      {!full && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={markets ? "Chercher un marché ouvert par sa question..." : "Chargement des marchés..."}
            style={input}
          />
          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid #2a2a35", borderRadius: "8px", overflow: "hidden" }}>
              {results.map((m) => (
                <button
                  key={m.id} type="button"
                  onClick={() => { add(m.id); setSearch(""); }}
                  style={{ textAlign: "left", padding: "10px 12px", background: "#12121a", color: "#e8e8f0", border: "none", borderBottom: "1px solid #22222d", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  {m.question}
                  <span style={{ color: "#8888a0", fontSize: "0.75rem", marginLeft: "8px" }}>{m.type === "multi" ? "choix multiples" : "oui / non"}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && markets && results.length === 0 && (
            <div style={{ fontSize: "0.85rem", color: "#8888a0" }}>Aucun marché ouvert ne correspond.</div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text" value={manual} onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
              placeholder="Ou coller un ou plusieurs IDs"
              style={{ ...input, flex: 1 }}
            />
            <button type="button" onClick={addManual} style={{ ...btn, padding: "0 16px" }}>Ajouter</button>
          </div>
        </>
      )}
      {full && <div style={{ fontSize: "0.85rem", color: "#f59e0b" }}>Limite atteinte. Retire un marché pour en ajouter un autre.</div>}
    </div>
  );
}

const input = {
  padding: "12px", backgroundColor: "#0a0a0f", color: "#e8e8f0", border: "1px solid #2a2a35",
  borderRadius: "6px", fontSize: "1rem", boxSizing: "border-box", width: "100%",
};
const btn = {
  background: "#12121a", border: "1px solid #2a2a35", color: "#e8e8f0", borderRadius: "6px",
  padding: "6px 10px", cursor: "pointer", fontSize: "0.9rem",
};
