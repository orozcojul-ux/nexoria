import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import api from "@/lib/api";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import DiscordCallback from "@/pages/DiscordCallback";
import Hero from "@/pages/Hero";
import Feed from "@/pages/Feed";
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
import BroadcastOverlay from "@/components/BroadcastOverlay";

function MaintenanceGate({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null);

  useEffect(() => {
    api.get("/system/maintenance").then((r) => setMaint(r.data)).catch(() => setMaint({ enabled: false }));
    const id = setInterval(() => api.get("/system/maintenance").then((r) => setMaint(r.data)).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  if (maint === null) return null;
  // Maintenance ON + non-admin + not already on maintenance route → redirect
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  if (maint.enabled && !isStaff && location.pathname !== "/maintenance") {
    window.location.replace("/maintenance");
    return null;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  const { banInfo } = useAuth();

  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  if (banInfo) return <BannedScreen banInfo={banInfo} />;

  return (
    <MaintenanceGate>
      <BroadcastOverlay />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/auth/discord/callback" element={<DiscordCallback />} />
        <Route path="/feed" element={<ProtectedRoute><Layout><Feed /></Layout></ProtectedRoute>} />
        <Route path="/hero" element={<ProtectedRoute><Layout><Hero /></Layout></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><Layout><SkillTree /></Layout></ProtectedRoute>} />
        <Route path="/kingdom" element={<ProtectedRoute><Layout><Kingdom /></Layout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><Layout><Quests /></Layout></ProtectedRoute>} />
        <Route path="/oracle" element={<ProtectedRoute><Layout><Oracle /></Layout></ProtectedRoute>} />
        <Route path="/leaderboards" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />
        <Route path="/legends" element={<ProtectedRoute><Layout><HallOfLegends /></Layout></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Layout><Shop /></Layout></ProtectedRoute>} />
        <Route path="/world" element={<ProtectedRoute><Layout><WorldMap /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      </Routes>
    </MaintenanceGate>
  );
}

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <AppRouter />
            <Toaster theme="dark" position="top-right" toastOptions={{
              style: { background: 'rgba(18,18,26,0.95)', border: '1px solid rgba(0,229,255,0.2)', color: '#fff' }
            }} />
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
