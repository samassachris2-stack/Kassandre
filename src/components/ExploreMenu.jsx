import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Bouton « Explorer » de la barre de navigation mobile : un appui ouvre un panneau
// avec deux grandes entrées, Marchés et Blog. Il remplace le simple lien « Blog »,
// ce qui libère de la place dans une barre déjà chargée.
const ITEMS = [
  {
    to: "/marches",
    label: "Marchés",
    hint: "Pronostiquez l'actualité",
    match: (p) => p === "/marches" || p.startsWith("/market/"),
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" />
      </svg>
    ),
  },
  {
    to: "/blog",
    label: "Blog",
    hint: "Analyses et décryptages",
    match: (p) => p.startsWith("/blog"),
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
];

export default function ExploreMenu() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(64);
  const btnRef = useRef(null);
  const current = ITEMS.find((i) => i.match(pathname));

  // Se ferme avec Échap (et au clic sur une entrée ou sur le fond).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) setTop(Math.round(btnRef.current.getBoundingClientRect().bottom + 10));
    setOpen((v) => !v);
  }

  return (
    <>
      <style>{`
        @keyframes kx-pop { from { opacity: 0; transform: translateY(-8px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes kx-fade { from { opacity: 0; } to { opacity: 1; } }
        .kx-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 16px; text-decoration: none; color: var(--k-text); border: 1px solid var(--k-border); background: var(--k-surface); transition: transform .15s, border-color .15s; }
        .kx-card:active { transform: scale(.98); }
        .kx-card[data-on="true"] { border-color: var(--k-accent); background: linear-gradient(135deg, rgba(var(--k-accent-rgb),0.28), rgba(var(--k-accent-rgb),0.08)); }
      `}</style>

      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "inline-flex", alignItems: "center", gap: "7px", cursor: "pointer", whiteSpace: "nowrap",
          fontSize: "14px", fontWeight: 600, padding: "7px 13px 7px 14px", borderRadius: "999px", color: "var(--k-text)",
          border: "1px solid rgba(var(--k-accent-rgb),0.6)",
          background: current || open ? "var(--k-accent)" : "rgba(var(--k-accent-rgb),0.15)",
        }}
      >
        {current ? current.label : "Explorer"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", animation: "kx-fade .15s ease-out" }}
          />
          <div
            role="menu"
            aria-label="Explorer"
            style={{
              position: "fixed", top: `${top}px`, left: "12px", right: "12px", zIndex: 200,
              padding: "14px", borderRadius: "20px", background: "var(--k-inset)",
              border: "1px solid rgba(var(--k-accent-rgb),0.35)", boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              animation: "kx-pop .18s ease-out",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--k-accent-text)", margin: "2px 4px 12px" }}>
              Explorer Kassandre
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ITEMS.map((i) => {
                const on = i.match(pathname);
                return (
                  <Link key={i.to} to={i.to} role="menuitem" className="kx-card" data-on={on} onClick={() => setOpen(false)}>
                    <span style={{
                      width: "50px", height: "50px", borderRadius: "14px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      color: on ? "#fff" : "var(--k-accent-text)",
                      background: on ? "var(--k-accent)" : "rgba(var(--k-accent-rgb),0.16)",
                    }}>{i.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "17px", fontWeight: 700 }}>{i.label}</span>
                      <span style={{ display: "block", fontSize: "13px", color: "var(--k-muted2)", marginTop: "2px" }}>{i.hint}</span>
                    </span>
                    <span aria-hidden="true" style={{ color: "var(--k-accent-text)", fontSize: "20px", fontWeight: 700 }}>›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
