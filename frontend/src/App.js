import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserPrefsSync } from "@/components/AppProviders";
import { NexusSocketProvider } from "@/contexts/NexusSocketContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import api from "@/lib/api";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import DiscordCallback from "@/pages/DiscordCallback";
import Hero from "@/pages/Hero";
import Feed from "@/pages/Feed";
import NewsArticle from "@/pages/NewsArticle";
import SkillTree from "@/pages/SkillTree";
import Kingdom from "@/pages/Kingdom";
import Inventory from "@/pages/Inventory";
import Quests from "@/pages/Quests";
import Oracle from "@/pages/Oracle";
import Leaderboards from "@/pages/Leaderboards";
import HallOfLegends from "@/pages/HallOfLegends";
import Admin from "@/pages/Admin";
import Profile from "@/pages/Profile";
import Shop from "@/pages/Shop";
import Settings from "@/pages/Settings";
import Maintenance from "@/pages/Maintenance";
import BannedScreen from "@/pages/BannedScreen";
import WorldMap from "@/pages/WorldMap";
import Guilds from "@/pages/Guilds";
import Forum from "@/pages/Forum";
import Friends from "@/pages/Friends";
import Tickets from "@/pages/Tickets";
import Nexus from "@/pages/Nexus";
import Classes from "@/pages/Classes";
import Events from "@/pages/Events";
import UnderConstruction from "@/pages/UnderConstruction";
import BroadcastOverlay from "@/components/BroadcastOverlay";
import StaffAlertOverlay from "@/components/StaffAlertOverlay";
import NexusOverlay from "@/components/NexusOverlay";
import NexusFAB from "@/components/NexusFAB";
import AetherTicker from "@/components/AetherTicker";

function MaintenanceGate({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null);

  useEffect(() => {
    const load = () => {
      api.get("/system/maintenance").then((r) => setMaint(r.data)).catch(() => setMaint({ enabled: false }));
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (maint === null || authLoading) return null;
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  if (maint.enabled && !isStaff && !maint.beta_access && location.pathname !== "/maintenance") {
    window.location.replace("/maintenance");
    return null;
  }
  return children;
}

/** Racine : les héros connectés vont au feed, les visiteurs voient la landing. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/feed" replace />;
  return <Landing />;
}

function AppRouter() {
  const location = useLocation();
  const { banInfo } = useAuth();

  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  if (banInfo) return <BannedScreen banInfo={banInfo} />;

  return (
    <MaintenanceGate>
      <BroadcastOverlay />
      <StaffAlertOverlay />
      <NexusOverlay />
      <NexusFAB />
      <AetherTicker />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/auth/discord/callback" element={<DiscordCallback />} />
        <Route path="/feed" element={<ProtectedRoute><Layout><Feed /></Layout></ProtectedRoute>} />
        <Route path="/news/:newsId" element={<ProtectedRoute><Layout><NewsArticle /></Layout></ProtectedRoute>} />
        <Route path="/hero" element={<ProtectedRoute><Layout><Hero /></Layout></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><Layout><SkillTree /></Layout></ProtectedRoute>} />
        <Route path="/kingdom" element={<ProtectedRoute><Layout><Kingdom /></Layout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><Layout><Quests /></Layout></ProtectedRoute>} />
        <Route path="/oracle" element={<ProtectedRoute><Layout><Oracle /></Layout></ProtectedRoute>} />
        <Route path="/leaderboards" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />
        <Route path="/rankings" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />
        <Route path="/legends" element={<ProtectedRoute><Layout><HallOfLegends /></Layout></ProtectedRoute>} />
        <Route path="/classes" element={<ProtectedRoute><Layout><Classes /></Layout></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Layout><Events /></Layout></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Layout><Shop /></Layout></ProtectedRoute>} />
        <Route path="/world" element={<ProtectedRoute><Layout><WorldMap /></Layout></ProtectedRoute>} />
        <Route path="/guilds" element={<ProtectedRoute><Layout><Guilds /></Layout></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute><Layout><Forum /></Layout></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><Layout><Friends /></Layout></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>} />
        <Route path="/nexus" element={<ProtectedRoute><Layout><Nexus /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/communaute" element={<ProtectedRoute><Layout><UnderConstruction title="Communauté" /></Layout></ProtectedRoute>} />
        <Route path="/conditions" element={<ProtectedRoute><Layout><UnderConstruction title="Conditions d'utilisation" /></Layout></ProtectedRoute>} />
        <Route path="/confidentialite" element={<ProtectedRoute><Layout><UnderConstruction title="Politique de confidentialité" /></Layout></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Layout><UnderConstruction /></Layout></ProtectedRoute>} />
      </Routes>
    </MaintenanceGate>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <UserPrefsSync>
                <NexusSocketProvider>
                  <AppRouter />
                  <Toaster theme="dark" position="top-right" toastOptions={{
                    style: { background: "var(--nx-surface)", border: "1px solid var(--nx-border)", color: "var(--nx-fg)" },
                  }} />
                </NexusSocketProvider>
              </UserPrefsSync>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
