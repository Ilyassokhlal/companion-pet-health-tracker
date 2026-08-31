import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import ChatHistory from "./pages/ChatHistory";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";
import Reset from "./pages/Reset";
import Forgot from "./pages/Forgot";
import Landing from "./pages/Landing";
import Photos from "./pages/Photos";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Walks from "./pages/Walks";
import Tracking from "./pages/Tracking";
import WeightTracking from "./pages/WeightTracking";
import Feeding from "./pages/Feeding";
import Budget from "./pages/Budget";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/tracking/weight" element={<WeightTracking />} />
          <Route path="/tracking/walks" element={<Walks />} />
          <Route path="/tracking/feeding" element={<Feeding />} />
          <Route path="/tracking/budget" element={<Budget />} />
          <Route path="/chat" element={<ChatHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}