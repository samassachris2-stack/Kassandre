import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const CATEGORIES = ["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"];

const S = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    height: "60px",
    background: "#0a0a0f",
    borderBottom: "0.5px solid rgba(124,58,237,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  logoLink: {
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e8e8f0",
    letterSpacing: "0.02em",
  },
  navLink: (active) => ({
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    padding: "7px 12px",
    borderRadius: "8px",
    color: active ? "#a78bfa" : "#a8a8b8",
    transition: "color 0.15s, background 0.15s",
  }),
  divider: {
    width: "0.5px",
    height: "24px",
    background: "rgba(124,58,237,0.2)",
    margin: "0 8px",
  },
  rightGroup: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  balance: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#a78bfa",
    background: "rgba(124,58,237,0.1)",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.2)",
    whiteSpace: "nowrap",
  },
  avatar: {
    borderRadius: "50%",
    border: "1.5px solid rgba(124,58,237,0.4)",
    display: "block",
    cursor: "pointer",
    transition: "border-color 0.15s",
    flexShrink: 0,
  },
  logoutBtn: {
    background: "transparent",
    border: "0.5px solid rgba(124,58,237,0.25)",
    color: "#a8a8b8",
    fontSize: "13px",
    fontWeight: "500",
    padding: "7px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
    whiteSpace: "nowrap",
  },
  loginBtn: {
    background: "#7c3aed",
    border: "none",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  hamburgerBtn: {
    background: "transparent",
    border: "none",
    color: "#e8e8f0",
    fontSize: "22px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
  },
  mobileMenu: {
    position: "absolute",
    top: "104px",
    left: 0,
    right: 0,
    background: "#0f0f17",
    borderBottom: "0.5px solid rgba(124,58,237,0.15)",
    display: "flex",
    flexDirection: "column",
    padding: "8px 16px 16px",
    gap: "4px",
    zIndex: 48,
  },
  mobileLink: (active) => ({
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "500",
    padding: "12px 8px",
    borderRadius: "8px",
    color: active ? "#a78bfa" : "#e8e8f0",
    background: active ? "rgba(124,58,237,0.1)" : "transparent",
  }),
  catBar: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    padding: "10px 24px",
    background: "#0a0a0f",
    borderBottom: "0.5px solid rgba(124,58,237,0.1)",
    position: "sticky",
    top: "60px",
    zIndex: 49,
    overflowX: "auto",
    whiteSpace: "nowrap",
  },
  catPill: (active) => ({
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "500",
    padding: "6px 13px",
    borderRadius: "20px",
    flexShrink: 0,
    border: active ? "0.5px solid rgba(124,58,237,0.5)" : "0.5px solid rgba(124,58,237,0.15)",
    background: active ? "rgba(124,58,237,0.18)" : "transparent",
    color: active ? "#a78bfa" : "#8888a0",
    transition: "all 0.15s",
  }),
};

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Échap ferme le menu mobile
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .kassandre-nav-desktop-links { display: flex; gap: 8px; align-items: center; }
        .kassandre-nav-hamburger { display: none; }
        .kassandre-nav-balance-text { display: inline; }
        @media (max-width: 720px) {
          .kassandre-nav-desktop-links { display: none !important; }
          .kassandre-nav-hamburger { display: flex !important; }
          .kassandre-nav-divider { display: none !important; }
        }
        @media (max-width: 480px) {
          .kassandre-nav-logo-text { display: none; }
        }
        .kassandre-cat-bar::-webkit-scrollbar { display: none; }
        .kassandre-cat-bar { scrollbar-width: none; }
      `}</style>

      <nav style={S.nav}>
        <Link to="/" style={S.logoLink}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path d="M 22 22 A 12 12 0 0 1 6 14" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
            <path d="M 6 14 A 12 12 0 0 1 22 6" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="4" fill="#7c3aed"/>
          </svg>
          <span style={S.logoText} className="kassandre-nav-logo-text">Kassandre</span>
        </Link>

        <div className="kassandre-nav-desktop-links">
          <Link
            to="/blog"
            style={S.navLink(location.pathname.startsWith("/blog"))}
            onMouseEnter={(e) => { if (!location.pathname.startsWith("/blog")) e.currentTarget.style.color = "#e8e8f0"; }}
            onMouseLeave={(e) => { if (!location.pathname.startsWith("/blog")) e.currentTarget.style.color = "#a8a8b8"; }}
          >
            Blog
          </Link>
          <Link
            to="/portefeuille"
            style={S.navLink(location.pathname === "/portefeuille")}
            onMouseEnter={(e) => { if (location.pathname !== "/portefeuille") e.currentTarget.style.color = "#e8e8f0"; }}
            onMouseLeave={(e) => { if (location.pathname !== "/portefeuille") e.currentTarget.style.color = "#a8a8b8"; }}
          >
            Portefeuille
          </Link>
        </div>

        <div className="kassandre-nav-divider" style={S.divider} />

        {user ? (
          <div style={S.rightGroup}>
            <NotificationBell />
            <span style={S.balance}>
              {Number(user.balance).toFixed(2)}<span className="kassandre-nav-balance-text"> pts</span>
            </span>
            <Link to="/settings">
              <img
                src={user.photoURL}
                width={32}
                height={32}
                style={S.avatar}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
              />
            </Link>
            <button
              onClick={logout}
              style={S.logoutBtn}
              className="kassandre-nav-desktop-links"
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.color = "#e8e8f0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.color = "#a8a8b8"; }}
            >
              Déconnexion
            </button>
            <button
              className="kassandre-nav-hamburger"
              style={S.hamburgerBtn}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        ) : (
          <button onClick={login} style={S.loginBtn}>Connexion Google</button>
        )}
      </nav>

      <div className="kassandre-cat-bar" style={S.catBar}>
        {CATEGORIES.map((cat) => {
          const active = decodeURIComponent(location.pathname.split("/")[1] || "") === cat;
          return (
            <Link
              key={cat}
              to={`/${encodeURIComponent(cat)}`}
              style={S.catPill(active)}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#e8e8f0"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#8888a0"; }}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {menuOpen && user && (
        <>
          {/* Fond assombri : toucher en dehors du menu le ferme */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", top: "60px", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", zIndex: 47 }}
          />
          <div role="menu" style={{
            position: "fixed", top: "68px", left: "8px", right: "8px", zIndex: 48,
            background: "#0f0f17", border: "0.5px solid rgba(124,58,237,0.3)",
            borderRadius: "14px", boxShadow: "0 12px 36px rgba(0,0,0,0.6)", padding: "10px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "8px 8px 14px", marginBottom: "6px",
              borderBottom: "0.5px solid rgba(124,58,237,0.15)",
            }}>
              <img
                src={user.photoURL}
                width={42}
                height={42}
                alt=""
                style={{ borderRadius: "50%", border: "2px solid rgba(124,58,237,0.5)", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#e8e8f0", fontWeight: 600, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.displayName || "Mon compte"}
                </div>
                <div style={{ color: "#a78bfa", fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>
                  {Number(user.balance).toFixed(2)} pts
                </div>
              </div>
            </div>

            {[
              ["Mon profil", `/profil/${user.uid}`],
              ["Portefeuille", "/portefeuille"],
              ["Blog", "/blog"],
              ...(user.isAdmin ? [["Gérer le blog", "/admin/blog"]] : []),
              ["Paramètres", "/settings"],
            ].map(([label, to]) => {
              const active = location.pathname === to || (to !== "/blog" && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "13px 10px", borderRadius: "8px", textDecoration: "none",
                    fontSize: "15px", fontWeight: 500,
                    color: active ? "#a78bfa" : "#e8e8f0",
                    background: active ? "rgba(124,58,237,0.12)" : "transparent",
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: "#4a4a60", fontSize: "18px" }}>›</span>
                </Link>
              );
            })}

            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); logout(); }}
              style={{
                display: "block", width: "100%", marginTop: "6px", padding: "13px 10px",
                background: "transparent", border: "none", borderTop: "0.5px solid rgba(124,58,237,0.15)",
                borderRadius: "0 0 8px 8px", color: "#ef4444", fontSize: "15px", fontWeight: 500,
                textAlign: "left", cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          </div>
        </>
      )}
    </>
  );
}