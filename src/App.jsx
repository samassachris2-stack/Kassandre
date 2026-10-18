import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Feed from "./pages/Feed";
const Market = lazy(() => import("./pages/Market"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Portefeuille = lazy(() => import("./pages/Portefeuille"));
const Profil = lazy(() => import("./pages/Profil"));
const Soumettre = lazy(() => import("./pages/Soumettre"));
const Admin = lazy(() => import("./pages/Admin"));
const BlogAdminPage = lazy(() => import("./pages/BlogAdminPage"));
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotificationHost from "./components/NotificationHost";
const Settings = lazy(() => import("./pages/Settings"));
const CGU = lazy(() => import("./pages/CGU"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const EmbedMarket = lazy(() => import("./pages/EmbedMarket"));

// Les pages /embed/... s'affichent seules, sans barre, pied de page ni notifications.
function Shell() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/embed/")) {
    return (
      <Suspense fallback={null}>
        <Routes><Route path="/embed/:id" element={<EmbedMarket />} /></Routes>
      </Suspense>
    );
  }
  return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Suspense fallback={<p style={{ padding: "40px", color: "#8888a0" }}>Chargement...</p>}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/presidentielle-2027" element={<Feed hub="presidentielle" />} />
            <Route path="/:cat" element={<Feed />} />
            <Route path="/:cat/:tag" element={<Feed />} />
            <Route path="/market/:id" element={<Market />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/portefeuille" element={<Portefeuille />} />
            <Route path="/profil/:uid" element={<Profil />} />
            <Route path="/soumettre" element={<Soumettre />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/blog" element={<BlogAdminPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
          </Routes>
          </Suspense>
        </div>
        <Footer />
        <NotificationHost />
      </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}