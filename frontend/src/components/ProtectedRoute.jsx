import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#6B1C1C" }}>Loading session…</div>;
  }

  if (!user) {
    return null;
  }

  return children;
}
