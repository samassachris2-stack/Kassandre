import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 24px",
      height: "60px",
      borderBottom: "1px solid #e5e7eb",
    }}>
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
  <svg width="28" height="28" viewBox="0 0 28 28">
    <path d="M 22 22 A 12 12 0 0 1 6 14" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
    <path d="M 6 14 A 12 12 0 0 1 22 6" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="4" fill="#7c3aed"/>
  </svg>
  <span style={{ fontSize: "18px", fontWeight: "600", color: "#e8e8f0", letterSpacing: "1gopx" }}>
  Kassandre
</span>
</Link>

      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <Link to="/leaderboard">Classement</Link>
        <Link to="/soumettre">Proposer</Link>
        {user ? (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>{user.balance} pts</span>
            <Link to="/settings">
  <img src={user.photoURL} width={32} height={32} style={{ borderRadius: "50%", border: "2px solid #7c3aed" }} />
</Link>
            <button onClick={logout}>Déconnexion</button>
          </div>
        ) : (
          <button onClick={login}>Connexion Google</button>
        )}
      </div>
    </nav>
  );
}

