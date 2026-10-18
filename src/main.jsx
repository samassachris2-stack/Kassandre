import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

// Après un déploiement, un onglet resté ouvert réclame des fichiers dont le nom
// a changé. Vite signale alors l'échec : on recharge la page une seule fois
// (le garde-fou évite une boucle si le problème est ailleurs).
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    const last = Number(sessionStorage.getItem("kassandre_reload_at") || 0);
    if (Date.now() - last < 30000) return;
    sessionStorage.setItem("kassandre_reload_at", String(Date.now()));
  } catch { /* stockage indisponible : on recharge quand même */ }
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>
);