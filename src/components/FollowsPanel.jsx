import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { getPublishedArticles } from "../lib/articles";
import { tagKey as blogTagKey } from "../lib/blogUtils";
import { notify } from "../lib/notify";

// Mêmes clés de stockage que les pages Marchés et Blog : ce que l'on règle ici
// s'applique tout de suite à ces pages (réglages enregistrés dans ce navigateur).
const MARKETS_KEY = "kassandre_markets_follow";
const BLOG_KEY = "kassandre_blog_follow";

const marketTagKey = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_]+/g, "-").trim();
const pretty = (t) => { const x = String(t || "").replace(/-/g, " ").trim(); return x.charAt(0).toUpperCase() + x.slice(1); };

function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}
function write(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* navigation privée */ }
}

const box = { border: "1px solid var(--k-border)", borderRadius: "10px", padding: "16px", background: "var(--k-surface)" };
const chip = (on) => ({
  display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 11px", borderRadius: "999px", fontSize: "13px", cursor: "pointer",
  border: `1px solid ${on ? "var(--k-accent)" : "var(--k-border)"}`,
  background: on ? "rgba(var(--k-accent-rgb),0.15)" : "transparent",
  color: on ? "var(--k-accent-text)" : "var(--k-muted)",
});

// Liste de thèmes suivis + suggestions à ajouter, pour un jeu de tags donné.
function TagManager({ title, hint, storageKey, keyOf, available }) {
  const [followed, setFollowed] = useState(() => read(storageKey));
  const [search, setSearch] = useState("");
  const labels = useMemo(() => new Map(available.map(([label]) => [keyOf(label), pretty(label)])), [available, keyOf]);

  function toggle(k) {
    setFollowed((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      write(storageKey, next);
      return next;
    });
  }

  const needle = keyOf(search);
  const pool = available.filter(([label]) => !followed.includes(keyOf(label)));
  const suggestions = needle ? pool.filter(([label]) => keyOf(label).includes(needle)).slice(0, 30) : pool.slice(0, 14);

  return (
    <div style={box}>
      <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{title}</p>
      <p style={{ fontSize: "13px", color: "var(--k-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>{hint}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
        {followed.length === 0 && <span style={{ fontSize: "13px", color: "var(--k-faint)" }}>Aucun thème suivi pour l'instant.</span>}
        {followed.map((k) => (
          <button key={k} type="button" onClick={() => toggle(k)} style={chip(true)} title="Ne plus suivre">
            {labels.get(k) || pretty(k)} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un thème…"
        aria-label={`Rechercher parmi les ${title.toLowerCase()}`}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid var(--k-border)", background: "var(--k-bg)", color: "var(--k-text)", fontSize: "13px" }}
      />

      {needle && suggestions.length === 0 && (
        <p style={{ fontSize: "13px", color: "var(--k-faint)", margin: 0 }}>Aucun thème ne correspond à « {search.trim()} ».</p>
      )}

      {suggestions.length > 0 && (
        <>
          <p style={{ fontSize: "12px", color: "var(--k-faint)", margin: "0 0 6px" }}>{needle ? "Résultats" : "À ajouter"}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {suggestions.map(([label, n]) => (
              <button key={label} type="button" onClick={() => toggle(keyOf(label))} style={chip(false)}>
                + {pretty(label)} <span style={{ color: "var(--k-faint)" }}>{n}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function countTags(items) {
  const counts = new Map();
  for (const it of items) for (const t of it.tags || []) {
    const k = String(t).trim();
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Marchés suivis individuellement (cloche) : ce sont eux qui déclenchent les alertes.
function FollowedMarkets({ uid }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "follows"), where("userId", "==", uid)));
        const rows = await Promise.all(snap.docs.map(async (d) => {
          const { marketId } = d.data();
          const m = await getDoc(doc(db, "markets", marketId)).catch(() => null);
          return { followId: d.id, marketId, question: m?.exists() ? m.data().question : null, status: m?.exists() ? m.data().status : null };
        }));
        if (!cancelled) setItems(rows.filter((r) => r.question));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  async function unfollow(row) {
    try {
      await deleteDoc(doc(db, "follows", row.followId));
      setItems((prev) => prev.filter((r) => r.followId !== row.followId));
    } catch {
      notify("Impossible de modifier le suivi pour le moment.", "error");
    }
  }

  return (
    <div style={box}>
      <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Marchés suivis</p>
      <p style={{ fontSize: "13px", color: "var(--k-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Vous recevez une alerte en cas de gros mouvement ou de résolution sur ces marchés.
      </p>
      {items === null ? (
        <p style={{ fontSize: "13px", color: "var(--k-faint)", margin: 0 }}>Chargement…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--k-faint)", margin: 0 }}>Aucun marché suivi. Utilisez le bouton « Suivre » sur la page d'un marché.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((r) => (
            <li key={r.followId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <Link to={`/market/${r.marketId}`} style={{ color: "var(--k-text)", fontSize: "14px", textDecoration: "none", lineHeight: 1.4 }}>
                {r.question}
                {r.status && r.status !== "open" && <span style={{ color: "var(--k-faint)", fontSize: "12px" }}> (terminé)</span>}
              </Link>
              <button type="button" onClick={() => unfollow(r)} style={{ ...chip(false), flexShrink: 0 }}>Ne plus suivre</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FollowsPanel() {
  const { user } = useAuth();
  const [marketTags, setMarketTags] = useState([]);
  const [blogTags, setBlogTags] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "markets"), where("status", "==", "open")))
      .then((snap) => { if (!cancelled) setMarketTags(countTags(snap.docs.map((d) => d.data()))); })
      .catch(() => {});
    getPublishedArticles()
      .then((arts) => { if (!cancelled) setBlogTags(countTags(arts)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontSize: "17px", margin: "8px 0 0" }}>Mes abonnements</h2>
      <TagManager
        title="Thèmes de marchés"
        hint="Les marchés de ces thèmes passent en premier sur la page Marchés."
        storageKey={MARKETS_KEY}
        keyOf={marketTagKey}
        available={marketTags}
      />
      <TagManager
        title="Thèmes du blog"
        hint="Ces thèmes ont leur propre section en haut de la page Blog."
        storageKey={BLOG_KEY}
        keyOf={blogTagKey}
        available={blogTags}
      />
      {user ? <FollowedMarkets uid={user.uid} /> : null}
    </div>
  );
}
