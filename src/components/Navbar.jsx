import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e8e8f0",
    letterSpacing: "0.02em",
  },
  navLinks: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
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
    gap: "16px",
    alignItems: "center",
  },
  balance: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#a78bfa",
    background: "rgba(124,58,237,0.1)",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.2)",
  },
  avatar: {
    borderRadius: "50%",
    border: "1.5px solid rgba(124,58,237,0.4)",
    display: "block",
    cursor: "pointer",
    transition: "border-color 0.15s",
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
  },
};

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const location = useLocation();

  return (
    <nav style={S.nav}>
      <Link to="/" style={S.logoLink}>
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path d="M 22 22 A 12 12 0 0 1 6 14" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
          <path d="M 6 14 A 12 12 0 0 1 22 6" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="14" cy="14" r="4" fill="#7c3aed"/>
        </svg>
        <span style={S.logoText}>Kassandre</span>
      </Link>

      <div style={S.navLinks}>
        <Link
          to="/portefeuille"
          style={S.navLink(location.pathname === "/portefeuille")}
          onMouseEnter={(e) => { if (location.pathname !== "/portefeuille") e.currentTarget.style.color = "#e8e8f0"; }}
          onMouseLeave={(e) => { if (location.pathname !== "/portefeuille") e.currentTarget.style.color = "#a8a8b8"; }}
        >
          Portefeuille
        </Link>
        <Link
          to="/soumettre"
          style={S.navLink(location.pathname === "/soumettre")}
          onMouseEnter={(e) => { if (location.pathname !== "/soumettre") e.currentTarget.style.color = "#e8e8f0"; }}
          onMouseLeave={(e) => { if (location.pathname !== "/soumettre") e.currentTarget.style.color = "#a8a8b8"; }}
        >
          Proposer
        </Link>
      </div>

      <div style={S.divider} />

      {user ? (
        <div style={S.rightGroup}>
          <span style={S.balance}>{Number(user.balance).toFixed(2)} pts</span>
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
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.color = "#e8e8f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.color = "#a8a8b8"; }}
          >
            Déconnexion
          </button>
        </div>
      ) : (
        <button onClick={login} style={S.loginBtn}>Connexion Google</button>
      )}
    </nav>
  );
}