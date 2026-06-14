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
      <Link to="/" style={{ fontWeight: "bold", fontSize: "20px", textDecoration: "none", color: "#000" }}>
        Kassandre
      </Link>

      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <Link to="/leaderboard">Classement</Link>
        <Link to="/soumettre">Proposer</Link>
        {user ? (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>{user.balance} pts</span>
            <Link to={`/profil/${user.uid}`}>
              <img src={user.photoURL} width={32} height={32} style={{ borderRadius: "50%" }} />
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