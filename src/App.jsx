import { BrowserRouter, Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed";
import Market from "./pages/Market";
import Leaderboard from "./pages/Leaderboard";
import Portefeuille from "./pages/Portefeuille";
import Profil from "./pages/Profil";
import Soumettre from "./pages/Soumettre";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/market/:id" element={<Market />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/portefeuille" element={<Portefeuille />} />
        <Route path="/profil/:uid" element={<Profil />} />
        <Route path="/soumettre" element={<Soumettre />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}