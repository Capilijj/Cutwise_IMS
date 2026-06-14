import { useState } from "react";
import logo from "../../assets/otto-logo.svg";
import { useAuth } from "../../contexts/AuthContext";
import HeroPanel from "./HeroPanel";

const ROLES = [
  {
    key: "sales_clerk",
    label: "Sales Clerk",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    key: "supervisor",
    label: "Supervisor",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: "admin",
    label: "Admin",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [step, setStep] = useState("role"); // "role" | "credentials"
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep("credentials");
    setError("");
  };

  const handleBack = () => {
    setStep("role");
    setSelectedRole(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email, password, selectedRole || "");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = ROLES.find((r) => r.key === selectedRole)?.label || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FAF8F5" }}>
      <HeroPanel />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 28px 28px",
          minWidth: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#8B1C1C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(139,28,28,0.18)",
              overflow: "hidden",
            }}
          >
            <img src={logo} alt="Otto Shoes" style={{ width: 54, height: 54, objectFit: "contain" }} />
          </div>
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 13,
              fontWeight: 700,
              color: "#8B1C1C",
              margin: 0,
            }}
          >
            OTTO SHOES
          </p>
        </div>

        {/* Card */}
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1C0606",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Welcome back!
          </h2>

          {step === "role" && (
            <>
              <p style={{ textAlign: "center", color: "#6B5050", fontSize: 14, marginBottom: 28 }}>
                Please select your account type to continue.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => handleRoleSelect(role.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: "1.5px solid #EDE8E1",
                      background: "#fff",
                      color: "#1C0606",
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#8B1C1C";
                      e.currentTarget.style.boxShadow = "0 2px 12px rgba(139,28,28,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#EDE8E1";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span style={{ color: "#6B4E4E" }}>{role.icon}</span>
                    <span style={{ flex: 1 }}>{role.label}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B1C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "credentials" && (
            <>
              <p style={{ textAlign: "center", color: "#6B5050", fontSize: 14, marginBottom: 28 }}>
                Signing in as <strong style={{ color: "#1C0606" }}>{roleLabel}</strong>. Please enter your credentials.
              </p>

              {error && (
                <div
                  style={{
                    background: "#FDECEA",
                    color: "#B00020",
                    border: "1px solid #F5C2C2",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Email field */}
              <div style={{ position: "relative", marginBottom: 14 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8C7A7A",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  style={{ ...inputStyle, paddingLeft: 42 }}
                  autoComplete="username"
                />
              </div>

              {/* Password field */}
              <div style={{ position: "relative", marginBottom: 14 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8C7A7A",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  style={{ ...inputStyle, paddingLeft: 42, paddingRight: 42 }}
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#8C7A7A",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember me + Forgot password */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#4A3030" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: "#8B1C1C", cursor: "pointer" }}
                  />
                  Remember me
                </label>
                <button
                  style={{ background: "none", border: "none", color: "#8B1C1C", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={buttonStyle}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <button
                onClick={handleBack}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "none",
                  border: "none",
                  color: "#8C7A7A",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "8px 0",
                }}
              >
                ← Back to role selection
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ fontSize: 11, color: "#B0A0A0", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          OTTO SHOES MANUFACTURING SYSTEM
        </p>
      </main>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1.5px solid #EDE8E1",
  background: "#fff",
  color: "#1C0606",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
};

const buttonStyle = {
  width: "100%",
  border: "none",
  borderRadius: 12,
  padding: "14px",
  background: "linear-gradient(135deg, #8B1C1C, #5A0A0A)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  letterSpacing: "0.02em",
};