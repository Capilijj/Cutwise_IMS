import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/Auth/LoginPage";
import SalesManagement from "./components/SalesManagement";

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#6B1C1C" }}>Checking session…</div>;
  }

  return user ? <SalesManagement /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}