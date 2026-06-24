import { BrowserRouter, Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed";
import Market from "./pages/Market";
import Leaderboard from "./pages/Leaderboard";
import Portefeuille from "./pages/Portefeuille";
import Profil from "./pages/Profil";
import Soumettre from "./pages/Soumettre";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Settings from "./pages/Settings";
import CGU from "./pages/CGU";
import Confidentialite from "./pages/Confidentialite";
import MentionsLegales from "./pages/MentionsLegales";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/market/:id" element={<Market />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/portefeuille" element={<Portefeuille />} />
            <Route path="/profil/:uid" element={<Profil />} />
            <Route path="/soumettre" element={<Soumettre />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}