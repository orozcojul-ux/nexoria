import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
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

function AppRouter() {
  const location = useLocation();
  // Handle Google OAuth callback BEFORE other routes (synchronous detection)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/feed" element={<ProtectedRoute><Layout><Feed /></Layout></ProtectedRoute>} />
      <Route path="/hero" element={<ProtectedRoute><Layout><Hero /></Layout></ProtectedRoute>} />
      <Route path="/skills" element={<ProtectedRoute><Layout><SkillTree /></Layout></ProtectedRoute>} />
      <Route path="/kingdom" element={<ProtectedRoute><Layout><Kingdom /></Layout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
      <Route path="/quests" element={<ProtectedRoute><Layout><Quests /></Layout></ProtectedRoute>} />
      <Route path="/oracle" element={<ProtectedRoute><Layout><Oracle /></Layout></ProtectedRoute>} />
      <Route path="/leaderboards" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />
      <Route path="/legends" element={<ProtectedRoute><Layout><HallOfLegends /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="top-right" toastOptions={{
            style: { background: 'rgba(18,18,26,0.95)', border: '1px solid rgba(0,229,255,0.2)', color: '#fff' }
          }} />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
