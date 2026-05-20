import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const apiFetch = async (path, options = {}) => {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const stored = localStorage.getItem('otto_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user?.id) headers['x-user-id'] = user.id;
    } catch {}
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText || "API request failed");
  return body;
};

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const C = {
  maroonDeep:  "#1C0606",
  maroonMid:   "#6B1C1C",
  maroonBtn:   "#8B2525",
  cream:       "#FAF8F5",
  white:       "#FFFFFF",
  border:      "#EDE9E3",
  borderLight: "#F3EFE9",
  textPrimary: "#1C1412",
  textSecond:  "#6B6560",
  textMuted:   "#AAA49E",
  rowAlt:      "#FDFCFB",
  error:       "#8B1A1A",
  errorBg:     "#FCE8E8",
  successBg:   "#E6F4EA",
  success:     "#1A6B2A",
  warnBg:      "#FEF3D7",
  warn:        "#7A5200",
};
const font = "'DM Sans', sans-serif";

/* ─── STATUS CONFIG ─────────────────────────────────────────── */
const STATUS_STYLE = {
  "Pending":    { color: C.warn,    bg: C.warnBg,    dot: "#D4A017" },
  "In Transit": { color: "#1A4F8B", bg: "#E6EEF9",   dot: "#2B6CB0" },
  "Delivered":  { color: C.success, bg: C.successBg, dot: "#2E8B47" },
  "Cancelled":  { color: C.error,   bg: C.errorBg,   dot: "#C0392B" },
};

// US-CDM-07: Valid transition matrix
const VALID_TRANSITIONS = {
  "Pending":    ["In Transit", "Cancelled"],
  "In Transit": ["Delivered", "Cancelled"],
  "Delivered":  [],  // closed — only via return initiation (Sprint 4)
  "Cancelled":  [],  // closed
};

const DELIVERY_TYPES = ["Outbound", "Inbound (Supplier)", "Branch Transfer"];

/* ─── HELPERS ───────────────────────────────────────────────── */
const genId = (prefix, list) => `${prefix}-${String((list?.length || 0) + 1).padStart(3, "0")}`;

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-PH", { month:"short", day:"2-digit", year:"numeric" }) : "—";

const today = () => new Date().toISOString().split("T")[0];

/* ─── SHARED UI COMPONENTS ──────────────────────────────────── */
const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { color: "#555", bg: "#EEE", dot: "#888" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:s.bg,
      color:s.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20, fontFamily:font }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot }} />
      {status}
    </span>
  );
};

const Btn = ({ children, primary, danger, outline, onClick, disabled, small, full }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
    padding: small ? "6px 12px" : "9px 18px", borderRadius:8, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 12 : 13, fontWeight:600, fontFamily:font, width: full ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1, transition:"opacity 0.15s",
    background: primary ? C.maroonBtn : danger ? C.errorBg : "transparent",
    color: primary ? C.white : danger ? C.error : C.textSecond,
    border: outline ? `1px solid ${C.border}` : primary || danger ? "none" : `1px solid ${C.border}`,
  }}>{children}</button>
);

const Input = ({ error, ...props }) => (
  <input {...props} style={{
    width:"100%", padding:"9px 12px", borderRadius:8, fontFamily:font, fontSize:13,
    border:`1px solid ${error ? C.error : C.border}`, outline:"none", background:"#FAFAFA",
    color:C.textPrimary, boxSizing:"border-box", ...props.style
  }} />
);

const Select = ({ error, children, ...props }) => (
  <select {...props} style={{
    width:"100%", padding:"9px 12px", borderRadius:8, fontFamily:font, fontSize:13,
    border:`1px solid ${error ? C.error : C.border}`, outline:"none", background:"#FAFAFA",
    color:C.textPrimary, cursor:"pointer", boxSizing:"border-box",
  }}>{children}</select>
);

const Field = ({ label, error, required, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    <label style={{ fontSize:12, color: error ? C.error : C.textSecond, fontFamily:font, fontWeight:500 }}>
      {label}{required && <span style={{ color:C.error }}> *</span>}
    </label>
    {children}
    {error && <span style={{ fontSize:11, color:C.error, fontFamily:font }}>{error}</span>}
  </div>
);

const Alert = ({ type, children }) => {
  const styles = {
    error:   { bg: C.errorBg,   color: C.error,   border: "#F5C0C0", icon: "✕" },
    success: { bg: C.successBg, color: C.success,  border: "#B5D9B5", icon: "✓" },
    warn:    { bg: C.warnBg,    color: C.warn,     border: "#F5DCA0", icon: "!" },
  };
  const s = styles[type] || styles.error;
  return (
    <div style={{ padding:"10px 14px", borderRadius:8, background:s.bg,
      border:`1px solid ${s.border}`, fontSize:13, color:s.color, fontFamily:font,
      display:"flex", alignItems:"flex-start", gap:8 }}>
      <span style={{ fontWeight:700 }}>{s.icon}</span>
      <span>{children}</span>
    </div>
  );
};

const Modal = ({ title, subtitle, onClose, children, width = 500 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(10,0,0,0.5)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    <div style={{ background:C.white, borderRadius:14, padding:"26px 30px", width,
      maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:C.textPrimary, fontFamily:font }}>{title}</h2>
          {subtitle && <p style={{ margin:"3px 0 0", fontSize:12, color:C.textMuted, fontFamily:font }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
          fontSize:20, color:C.textMuted, lineHeight:1, padding:4 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const StatCard = ({ label, value, sub, icon, accent }) => (
  <div style={{ flex:1, background:C.white, borderRadius:12, border:`1px solid ${C.border}`,
    padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
    <div>
      <p style={{ margin:0, fontSize:12, color:C.textMuted, fontFamily:font }}>{label}</p>
      <p style={{ margin:"5px 0 2px", fontSize:26, fontWeight:700, color:C.textPrimary, fontFamily:font }}>{value}</p>
      <p style={{ margin:0, fontSize:12, color:C.textSecond, fontFamily:font }}>{sub}</p>
    </div>
    <div style={{ width:38, height:38, borderRadius:10, background: accent || "#FDF0E8",
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>{icon}</div>
  </div>
);

/* ─── LOGIN PAGE ────────────────────────────────────────────── */
// US-AUTH-01
const SignUpPage = ({ onBack, onLogin }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);

    try {
      const user = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName || email }) });
      setSuccess('Account created. Logged in.');
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:C.cream, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width:420, background:C.maroonDeep, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:C.maroonBtn,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, fontWeight:800, color:C.white, marginBottom:20 }}>O</div>
        <h1 style={{ margin:"0 0 8px", fontSize:28, fontWeight:800, color:C.white, textAlign:"center" }}>OTTO Shoes</h1>
        <p style={{ margin:"0 0 40px", fontSize:14, color:"rgba(255,255,255,0.5)", textAlign:"center" }}>Create an employee account</p>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:380 }}>
          <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:700, color:C.textPrimary }}>Create account</h2>
          <p style={{ margin:"0 0 32px", fontSize:14, color:C.textMuted }}>Register an OTTO employee account</p>

          {error && <div style={{ marginBottom:16 }}><Alert type="error">{error}</Alert></div>}
          {success && <div style={{ marginBottom:16 }}><Alert type="success">{success}</Alert></div>}

          <form onSubmit={handleSignUp}>
            <div style={{ marginBottom:12 }}>
              <Field label="Full name">
                <Input type="text" placeholder="Juan Dela Cruz" value={fullName}
                  onChange={e => setFullName(e.target.value)} />
              </Field>
            </div>

            <div style={{ marginBottom:12 }}>
              <Field label="Email address" required>
                <Input type="email" placeholder="you@ottoshoes.com.ph" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </Field>
            </div>

            <div style={{ marginBottom:12 }}>
              <Field label="Password" required>
                <Input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </Field>
            </div>

            <div style={{ marginBottom:20 }}>
              <Field label="Confirm password" required>
                <Input type="password" placeholder="••••••••" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required />
              </Field>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <Btn outline onClick={onBack}>Back</Btn>
              <Btn primary full disabled={loading}>{loading ? "Creating…" : "Create Account"}</Btn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const resp = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLogin(resp.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    }
    setLoading(false);
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resp = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setResetToken(resp.token || "");
    } catch (err) {
      setError(err.message || 'Failed to request reset token');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: resetToken, password: newPassword }) });
      // after reset, show login
      setShowForgot(false);
      setResetToken("");
      setNewPassword("");
      alert('Password updated. Please sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  if (showSignUp) return <SignUpPage onBack={() => setShowSignUp(false)} onLogin={onLogin} />;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.cream, fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left panel */}
      <div style={{ width:420, background:C.maroonDeep, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:C.maroonBtn,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, fontWeight:800, color:C.white, marginBottom:20 }}>O</div>
        <h1 style={{ margin:"0 0 8px", fontSize:28, fontWeight:800, color:C.white, textAlign:"center" }}>OTTO Shoes</h1>
        <p style={{ margin:"0 0 40px", fontSize:14, color:"rgba(255,255,255,0.5)", textAlign:"center" }}>CutWise IMS — Delivery System</p>
        <div style={{ width:"100%", padding:24, borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
          {[
            { icon:"🚚", text:"Track outgoing deliveries in real-time" },
            { icon:"🔗", text:"Linked to Sales Transactions (Sub2)" },
            { icon:"📋", text:"Immutable delivery status history log" },
            { icon:"📦", text:"Supplier & branch transfer tracking" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:"flex", gap:12, marginBottom:14, alignItems:"center" }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.65)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:380 }}>
          <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:700, color:C.textPrimary }}>Welcome back</h2>
          <p style={{ margin:"0 0 32px", fontSize:14, color:C.textMuted }}>Sign in to your OTTO employee account</p>

          {error && <div style={{ marginBottom:16 }}><Alert type="error">{error}</Alert></div>}

          {!showForgot ? (
            <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <Field label="Email address" required>
                <Input type="email" placeholder="you@ottoshoes.com.ph" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </Field>
            </div>
            <div style={{ marginBottom:24 }}>
              <Field label="Password" required>
                <Input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </Field>
            </div>
              <Btn primary full disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Btn>
              <div style={{ marginTop:12, textAlign:"center" }}>
                <button type="button" onClick={() => setShowForgot(true)} style={{ background:"none", border:"none", color:C.maroonBtn, cursor:"pointer", fontWeight:700 }}>Forgot password?</button>
              </div>
            </form>
          ) : (
            <form onSubmit={resetToken ? handleResetPassword : handleRequestReset}>
              <div style={{ marginBottom:12 }}>
                <Field label="Email address" required>
                  <Input type="email" placeholder="you@ottoshoes.com.ph" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </Field>
              </div>
              {resetToken ? (
                <>
                  <div style={{ marginBottom:12 }}>
                    <Field label="Reset Token (for testing)">
                      <Input value={resetToken} onChange={e => setResetToken(e.target.value)} />
                    </Field>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <Field label="New password" required>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </Field>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <Btn outline onClick={() => { setShowForgot(false); setResetToken(""); setNewPassword(""); }}>Back</Btn>
                    <Btn primary full disabled={loading}>{loading ? "…" : "Reset Password"}</Btn>
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", gap:10 }}>
                  <Btn outline onClick={() => setShowForgot(false)}>Back</Btn>
                  <Btn primary full disabled={loading}>{loading ? "…" : "Request Reset Token"}</Btn>
                </div>
              )}
            </form>
            )}

          <p style={{ marginTop:14, fontSize:12, color:C.textMuted, textAlign:"center" }}>
            Forgot your password? Contact your system administrator.
          </p>
          <p style={{ marginTop:8, fontSize:12, color:C.textMuted, textAlign:"center" }}>
            Don't have an account? <button onClick={() => setShowSignUp(true)} style={{ background:"none", border:"none", color:C.maroonBtn, fontWeight:700, cursor:"pointer" }}>Create one</button>
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── SALE LOOKUP (Sub2 Integration — US-INT-01, 02) ────────── */
const SaleLookup = ({ value, onChange, onValidated, error }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  const lookup = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setLookupError("");
    setResult(null);

    try {
      const data = await apiFetch(`/api/sales/${encodeURIComponent(value.trim())}`);
      if (!data) {
        setLookupError("Sale Transaction ID not found. Please check and try again.");
        onValidated(null);
        setLoading(false);
        return;
      }
      if (data.status !== "Finalized") {
        setLookupError(`Sale is not Finalized (current status: ${data.status}). Only Finalized sales can have a delivery.`);
        onValidated(null);
        setLoading(false);
        return;
      }

      const existing = await apiFetch(`/api/deliveries?active=true&sale_transaction_id=${encodeURIComponent(value.trim())}`).catch(() => []);
      if (existing && existing.length > 0) {
        setLookupError(`This sale already has an active delivery (${existing[0].id}). Only one active delivery per sale is allowed.`);
        onValidated(null);
      } else {
        setResult(data);
        onValidated(data);
      }
    } catch (err) {
      setLookupError("Sale Transaction ID not found. Please check and try again.");
      onValidated(null);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display:"flex", gap:8 }}>
        <Input placeholder="e.g. SO-2026-041" value={value}
          onChange={e => { onChange(e.target.value); setResult(null); setLookupError(""); onValidated(null); }}
          error={error || lookupError} />
        <Btn onClick={lookup} disabled={loading || !value.trim()}>
          {loading ? "…" : "Validate"}
        </Btn>
      </div>
      {lookupError && <p style={{ margin:"6px 0 0", fontSize:12, color:C.error, fontFamily:font }}>{lookupError}</p>}
      {result && (
        <div style={{ marginTop:10, padding:12, background:C.successBg, borderRadius:8,
          border:`1px solid #B5D9B5` }}>
          <p style={{ margin:"0 0 4px", fontSize:12, fontWeight:600, color:C.success, fontFamily:font }}>✓ Sale validated</p>
          <p style={{ margin:0, fontSize:12, color:"#2A4A2A", fontFamily:font }}>
            <strong>{result.customer}</strong> · {result.items} · Qty: {result.qty}
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── CREATE DELIVERY MODAL (US-CDM-02, 03, INT-01, 02) ──────── */
const CreateDeliveryModal = ({ onClose, onSaved, user }) => {
  const [saleId, setSaleId] = useState("");
  const [validatedSale, setValidatedSale] = useState(null);
  const [form, setForm] = useState({
    delivery_address: "", assigned_courier: "",
    scheduled_date: "", delivery_type: "Outbound", remarks: ""
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!validatedSale) e.saleId = "Please validate a Sale Transaction ID first.";
    if (!form.delivery_address.trim()) e.delivery_address = "Delivery address is required.";
    if (!form.scheduled_date) e.scheduled_date = "Scheduled date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setGlobalError("");

    // Generate new ID
    const newId = `DEL-${Date.now()}`;

    // US-INT-02: Cache customer_name, item_description, quantity from Sub2
    const delivery = {
      id: newId,
      sale_transaction_id: saleId.trim(),
      customer_name: validatedSale.customer,
      item_description: validatedSale.items,
      quantity: validatedSale.qty,
      delivery_address: form.delivery_address,
      assigned_courier: form.assigned_courier || null,
      scheduled_date: form.scheduled_date,
      delivery_type: form.delivery_type,
      remarks: form.remarks || null,
      current_status: "Pending",
      created_by: user?.email || "system",
    };

    try {
      await apiFetch('/api/deliveries', { method: 'POST', body: JSON.stringify(delivery) });
      onSaved();
      onClose();
    } catch (err) {
      setGlobalError('Failed to save delivery. ' + (err.message || 'Server error'));
      setSaving(false);
      return;
    }
  };

  return (
    <Modal title="Record New Delivery" subtitle="Link to a finalized sale from Subsystem 2" onClose={onClose} width={520}>
      {globalError && <div style={{ marginBottom:16 }}><Alert type="error">{globalError}</Alert></div>}

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Field label="Sale Transaction ID (Sub2)" required error={errors.saleId}>
          <SaleLookup value={saleId} onChange={setSaleId}
            onValidated={setValidatedSale} error={errors.saleId} />
        </Field>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Delivery Type">
            <Select value={form.delivery_type} onChange={e => set("delivery_type", e.target.value)}>
              {DELIVERY_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>

          <Field label="Assigned Courier">
            <Input placeholder="Courier name" value={form.assigned_courier}
              onChange={e => set("assigned_courier", e.target.value)} />
          </Field>
        </div>

        <Field label="Delivery Address" required error={errors.delivery_address}>
          <Input placeholder="Street, Barangay, City" value={form.delivery_address}
            onChange={e => set("delivery_address", e.target.value)} error={errors.delivery_address} />
        </Field>

        <Field label="Scheduled Date" required error={errors.scheduled_date}>
          <Input type="date" value={form.scheduled_date}
            onChange={e => set("scheduled_date", e.target.value)} error={errors.scheduled_date} />
        </Field>

        <Field label="Remarks">
          <Input placeholder="Optional notes" value={form.remarks}
            onChange={e => set("remarks", e.target.value)} />
        </Field>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:24 }}>
        <Btn outline onClick={onClose}>Cancel</Btn>
        <Btn primary full disabled={saving || !validatedSale} onClick={handleSave}>
          {saving ? "Saving…" : "Save Delivery Record"}
        </Btn>
      </div>
    </Modal>
  );
};

/* ─── STATUS UPDATE MODAL (US-CDM-06, CDM-07, DSHA-01) ──────── */
const StatusUpdateModal = ({ delivery, onClose, onUpdated, user }) => {
  const allowed = VALID_TRANSITIONS[delivery.current_status] || [];
  const [selected, setSelected] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async () => {
    if (!selected) { setError("Please select a new status."); return; }
    if (selected === "Cancelled" && !remark.trim()) {
      setError("A remark is required when cancelling a delivery."); return;
    }
    setSaving(true);
    setError("");

    try {
      await apiFetch(`/api/deliveries/${encodeURIComponent(delivery.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ current_status: selected, actual_delivery_date: selected === 'Delivered' ? today() : null, changed_by: user?.email || 'system', remark: remark.trim() || null })
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update status');
      setSaving(false);
      return;
    }
  };

  return (
    <Modal title="Update Delivery Status" subtitle={`${delivery.id} — ${delivery.customer_name}`} onClose={onClose} width={420}>
      {allowed.length === 0 ? (
        <Alert type="warn">
          This delivery is <strong>{delivery.current_status}</strong> and cannot be changed.
          {delivery.current_status === "Delivered" && " Use Return Initiation to process a return (Sprint 4)."}
        </Alert>
      ) : (
        <>
          <p style={{ margin:"0 0 12px", fontSize:13, color:C.textSecond, fontFamily:font }}>
            Current status: <Badge status={delivery.current_status} />
          </p>

          <p style={{ margin:"0 0 10px", fontSize:12, color:C.textMuted, fontFamily:font }}>
            Select new status:
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {allowed.map(s => (
              <button key={s} onClick={() => { setSelected(s); setError(""); }} style={{
                padding:"12px 16px", borderRadius:8, cursor:"pointer", textAlign:"left",
                fontFamily:font, fontSize:13, fontWeight:500,
                border: selected === s ? `2px solid ${C.maroonBtn}` : `1px solid ${C.border}`,
                background: selected === s ? "#FDF0E8" : C.white,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Badge status={s} />
                <span style={{ fontSize:12, color:C.textMuted }}>
                  {s === "In Transit" && "Mark as dispatched and on the way"}
                  {s === "Delivered" && "Mark as successfully received by customer"}
                  {s === "Cancelled" && "Cancel this delivery (requires reason)"}
                </span>
              </button>
            ))}
          </div>

          <Field label={`Remark${selected === "Cancelled" ? " (required for cancellation)" : " (optional)"}`}
            error={error && selected === "Cancelled" && !remark ? error : ""}>
            <Input placeholder={selected === "Cancelled" ? "State the reason for cancellation…" : "Add a note (optional)"}
              value={remark} onChange={e => setRemark(e.target.value)} />
          </Field>

          {error && <div style={{ marginTop:10 }}><Alert type="error">{error}</Alert></div>}

          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <Btn outline onClick={onClose}>Cancel</Btn>
            <Btn primary full disabled={saving || !selected} onClick={handleUpdate}>
              {saving ? "Updating…" : "Confirm Status Update"}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
};

/* ─── STATUS HISTORY MODAL (US-DSHA-01, 04) ─────────────────── */
const HistoryModal = ({ delivery, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/deliveries/${encodeURIComponent(delivery.id)}/history`)
      .then(data => { setHistory(data || []); setLoading(false); })
      .catch(() => { setHistory([]); setLoading(false); });
  }, [delivery.id]);

  return (
    <Modal title="Status History" subtitle={`${delivery.id} — ${delivery.customer_name}`} onClose={onClose} width={560}>
      {loading ? (
        <p style={{ textAlign:"center", color:C.textMuted, fontFamily:font, padding:20 }}>Loading…</p>
      ) : history.length === 0 ? (
        <Alert type="warn">No status history found.</Alert>
      ) : (
        <div style={{ position:"relative" }}>
          {/* Timeline line */}
          <div style={{ position:"absolute", left:15, top:10, bottom:10, width:2,
            background:C.border, borderRadius:2 }} />

          {history.map((h, i) => (
            <div key={h.id} style={{ display:"flex", gap:16, marginBottom: i < history.length-1 ? 20 : 0,
              position:"relative" }}>
              {/* Dot */}
              <div style={{ width:30, height:30, borderRadius:"50%",
                background: i === history.length-1 ? C.maroonBtn : C.border,
                border:`2px solid ${C.white}`, display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0, zIndex:1, fontSize:12,
                color: i === history.length-1 ? C.white : C.textMuted, fontWeight:700 }}>
                {i + 1}
              </div>

              {/* Content */}
              <div style={{ flex:1, background:C.white, borderRadius:8, border:`1px solid ${C.border}`,
                padding:"10px 14px", marginTop:2 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {h.old_status ? (
                      <>
                        <Badge status={h.old_status} />
                        <span style={{ fontSize:12, color:C.textMuted }}>→</span>
                      </>
                    ) : (
                      <span style={{ fontSize:12, color:C.textMuted, fontStyle:"italic" }}>Created</span>
                    )}
                    <Badge status={h.new_status} />
                  </div>
                  <span style={{ fontSize:11, color:C.textMuted, fontFamily:font, flexShrink:0 }}>
                    {new Date(h.changed_at).toLocaleString("en-PH", { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })}
                  </span>
                </div>
                {h.remark && (
                  <p style={{ margin:"4px 0 0", fontSize:12, color:C.textSecond, fontFamily:font,
                    fontStyle:"italic" }}>"{h.remark}"</p>
                )}
                <p style={{ margin:"4px 0 0", fontSize:11, color:C.textMuted, fontFamily:font }}>
                  by {h.changed_by}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

/* ─── DELIVERY DETAIL MODAL (US-CDM-05) ─────────────────────── */
const DetailModal = ({ delivery, onClose, onStatusUpdate, user }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const canEdit = delivery.current_status === "Pending" || delivery.current_status === "In Transit";

  if (showHistory) return <HistoryModal delivery={delivery} onClose={() => setShowHistory(false)} />;
  if (showStatusUpdate) return (
    <StatusUpdateModal delivery={delivery} user={user}
      onClose={() => setShowStatusUpdate(false)} onUpdated={() => { onStatusUpdate(); onClose(); }} />
  );

  const fields = [
    { label:"Delivery ID",          val: delivery.id },
    { label:"Sale Transaction ID",   val: delivery.sale_transaction_id },
    { label:"Delivery Type",         val: delivery.delivery_type || "Outbound" },
    { label:"Customer",              val: delivery.customer_name },
    { label:"Items",                 val: delivery.item_description },
    { label:"Quantity",              val: delivery.quantity },
    { label:"Delivery Address",      val: delivery.delivery_address || "—" },
    { label:"Assigned Courier",      val: delivery.assigned_courier || "—" },
    { label:"Scheduled Date",        val: fmt(delivery.scheduled_date) },
    { label:"Actual Delivery Date",  val: fmt(delivery.actual_delivery_date) },
    { label:"Created By",            val: delivery.created_by || "—" },
    { label:"Created At",            val: new Date(delivery.created_at).toLocaleString("en-PH") },
    { label:"Remarks",               val: delivery.remarks || "—" },
  ];

  return (
    <Modal title="Delivery Details" subtitle={`Record for ${delivery.customer_name}`} onClose={onClose} width={560}>
      <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        <Badge status={delivery.current_status} />
        {canEdit && <Btn small onClick={() => setShowStatusUpdate(true)}>Update Status</Btn>}
        <Btn small outline onClick={() => setShowHistory(true)}>📋 View History</Btn>
      </div>

      <div style={{ background:C.cream, borderRadius:10, padding:16, marginBottom:16 }}>
        {fields.map(({ label, val }) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between",
            padding:"7px 0", borderBottom:`1px solid ${C.borderLight}` }}>
            <span style={{ fontSize:12, color:C.textMuted, fontFamily:font }}>{label}</span>
            <span style={{ fontSize:13, color:C.textPrimary, fontFamily:font, fontWeight:500,
              maxWidth:280, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis" }}>{val}</span>
          </div>
        ))}
      </div>

      <Btn outline full onClick={onClose}>Close</Btn>
    </Modal>
  );
};

/* ─── DELIVERY DASHBOARD (US-CDM-01) ────────────────────────── */
const DeliveryDashboard = ({ user }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Active");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailDel, setDetailDel] = useState(null);
  const [statusDel, setStatusDel] = useState(null);
  const [historyDel, setHistoryDel] = useState(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/deliveries?active=true');
      setDeliveries(data || []);
    } catch (err) {
      console.error(err);
      setDeliveries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  // Filtered data
  const active = deliveries.filter(d => ["Pending", "In Transit"].includes(d.current_status));
  const history = deliveries.filter(d => ["Delivered", "Cancelled"].includes(d.current_status));
  const tableData = activeTab === "Active" ? active : history;

  const statusOptions = activeTab === "Active" ? ["All", "Pending", "In Transit"] : ["All", "Delivered", "Cancelled"];

  const filtered = tableData.filter(d => {
    const matchStatus = statusFilter === "All" || d.current_status === statusFilter;
    const matchType = typeFilter === "All" || d.delivery_type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || d.id.toLowerCase().includes(q)
      || d.customer_name.toLowerCase().includes(q)
      || d.sale_transaction_id.toLowerCase().includes(q)
      || (d.item_description || "").toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  // Stats
  const total = deliveries.length;
  const inTransit = deliveries.filter(d => d.status === "In Transit" || d.current_status === "In Transit").length;
  const pending = deliveries.filter(d => d.current_status === "Pending").length;
  const delivered = deliveries.filter(d => d.current_status === "Delivered").length;

  const Th = ({ children, w }) => (
    <th style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600,
      color:C.textMuted, letterSpacing:0.6, fontFamily:font, width:w, whiteSpace:"nowrap",
      background:"#FAF7F4", borderBottom:`1px solid ${C.border}` }}>{children}</th>
  );

  const Td = ({ children, bold, muted, accent, w }) => (
    <td style={{ padding:"11px 14px", fontSize:13, fontFamily:font, width:w,
      color: accent ? C.maroonBtn : bold ? C.textPrimary : muted ? C.textMuted : C.textSecond,
      fontWeight: bold ? 600 : 400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
      maxWidth: w || 200 }}>{children}</td>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"28px 32px", background:C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <h1 style={{ margin:0, fontSize:21, fontWeight:700, color:C.textPrimary, fontFamily:font }}>
            Delivery System
          </h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.textMuted, fontFamily:font }}>
            Subsystem 3 — Sprint 1 · Logged in as {user?.email}
          </p>
        </div>
        <Btn primary onClick={() => setShowCreate(true)}>+ Record Delivery</Btn>
      </div>

      {/* Stat Cards */}
      <div style={{ display:"flex", gap:14, marginBottom:22 }}>
        <StatCard label="Total Deliveries"  value={total}     sub={`${active.length} active`}       icon="📦" />
        <StatCard label="In Transit"        value={inTransit} sub="Currently moving"                icon="🚚" accent="#EDF4FF" />
        <StatCard label="Pending Dispatch"  value={pending}   sub="Awaiting pickup"                 icon="⏳" accent="#FEF3D7" />
        <StatCard label="Delivered"         value={delivered} sub="Successfully completed"           icon="✅" accent="#E6F4EA" />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:8 }}>
          {["Active", "History"].map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setStatusFilter("All"); }} style={{
              padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:13, fontWeight:600, fontFamily:font,
              background: activeTab === t ? C.maroonBtn : C.white,
              color: activeTab === t ? C.white : C.textSecond,
              boxShadow: activeTab === t ? "none" : `0 0 0 1px ${C.border}`,
            }}>{t === "Active" ? `Active Deliveries (${active.length})` : `History (${history.length})`}</button>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <input placeholder="Search ID, customer, sale…" value={search}
            onChange={e => setSearch(e.target.value)} style={{
              padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`,
              fontSize:13, fontFamily:font, outline:"none", background:C.white, width:220,
            }} />
          {statusOptions.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer",
              fontSize:12, fontFamily:font,
              background: statusFilter === s ? C.maroonBtn : "#EEE",
              color: statusFilter === s ? C.white : C.textSecond,
            }}>{s}</button>
          ))}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`,
            fontSize:12, fontFamily:font, background:C.white, cursor:"pointer", color:C.textSecond,
          }}>
            <option value="All">All Types</option>
            {DELIVERY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:C.textMuted, fontFamily:font }}>
            Loading deliveries…
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
            <thead>
              <tr>
                <Th w="13%">DELIVERY ID</Th>
                <Th w="12%">SALE TXN ID</Th>
                <Th w="15%">CUSTOMER</Th>
                <Th w="16%">ITEMS</Th>
                <Th w="5%">QTY</Th>
                <Th w="10%">TYPE</Th>
                <Th w="10%">SCHEDULED</Th>
                <Th w="12%">COURIER</Th>
                <Th w="9%">STATUS</Th>
                <Th w="8%">ACTIONS</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding:40, textAlign:"center", color:C.textMuted,
                    fontFamily:font, fontSize:13 }}>
                    {search || statusFilter !== "All" || typeFilter !== "All"
                      ? "No deliveries found matching your criteria."
                      : activeTab === "Active" ? "No active deliveries. Create one above."
                      : "No delivery history yet."}
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ borderBottom:`1px solid ${C.borderLight}`,
                  background: i % 2 === 0 ? C.white : C.rowAlt }}>
                  <Td accent>{d.id}</Td>
                  <Td muted>{d.sale_transaction_id}</Td>
                  <Td bold>{d.customer_name}</Td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:C.textSecond, fontFamily:font,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {d.item_description}
                  </td>
                  <Td>{d.quantity}</Td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:20,
                      background: d.delivery_type === "Inbound (Supplier)" ? "#EDF4FF"
                        : d.delivery_type === "Branch Transfer" ? "#F0F0FF" : "#FDF0E8",
                      color: d.delivery_type === "Inbound (Supplier)" ? "#1A4F8B"
                        : d.delivery_type === "Branch Transfer" ? "#4A1A8B" : C.maroonBtn,
                      fontFamily:font, fontWeight:500 }}>
                      {d.delivery_type || "Outbound"}
                    </span>
                  </td>
                  <Td muted>{fmt(d.scheduled_date)}</Td>
                  <Td muted>{d.assigned_courier || "—"}</Td>
                  <td style={{ padding:"11px 14px" }}><Badge status={d.current_status} /></td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => setDetailDel(d)} title="View details"
                        style={{ background:"none", border:"none", cursor:"pointer",
                          fontSize:15, color:C.textMuted, padding:2 }}>👁</button>
                      {(d.current_status === "Pending" || d.current_status === "In Transit") && (
                        <button onClick={() => setStatusDel(d)} title="Update status"
                          style={{ background:"none", border:"none", cursor:"pointer",
                            fontSize:15, color:C.textMuted, padding:2 }}>✏</button>
                      )}
                      <button onClick={() => setHistoryDel(d)} title="Status history"
                        style={{ background:"none", border:"none", cursor:"pointer",
                          fontSize:15, color:C.textMuted, padding:2 }}>📋</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ margin:"10px 0 0", fontSize:12, color:C.textMuted, fontFamily:font }}>
        Showing {filtered.length} of {tableData.length} records
      </p>

      {/* Modals */}
      {showCreate && (
        <CreateDeliveryModal user={user}
          onClose={() => setShowCreate(false)} onSaved={fetchDeliveries} />
      )}
      {detailDel && (
        <DetailModal delivery={detailDel} user={user}
          onClose={() => setDetailDel(null)} onStatusUpdate={fetchDeliveries} />
      )}
      {statusDel && (
        <StatusUpdateModal delivery={statusDel} user={user}
          onClose={() => setStatusDel(null)} onUpdated={fetchDeliveries} />
      )}
      {historyDel && (
        <HistoryModal delivery={historyDel} onClose={() => setHistoryDel(null)} />
      )}
    </div>
  );
};

const SettingsPage = ({ user, onProfileUpdated }) => {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || "");
    setUsername(user?.username || "");
    setAvatarUrl(user?.avatar_url || "");
    setStatusMessage("");
    if (user?.role === 'Admin') {
      setLoadingEmployees(true);
      apiFetch('/api/employees')
        .then(data => setEmployees(data || []))
        .catch(err => setStatusMessage(err.message || 'Unable to load employees'))
        .finally(() => setLoadingEmployees(false));
    }
  }, [user]);

  const submitProfile = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: fullName,
        username: username,
        avatar_url: avatarUrl || null,
      };
      if (newPassword) payload.password = newPassword;
      const updated = await apiFetch(`/api/employees/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      onProfileUpdated(updated);
      setStatusMessage('Profile updated successfully.');
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatusMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changeEmployeeRole = async (employeeId, newRole) => {
    setStatusMessage("");
    try {
      const updated = await apiFetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setEmployees(employees.map(emp => emp.id === employeeId ? updated : emp));
      setStatusMessage(`Updated ${updated.full_name}'s role to ${updated.role}.`);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to update role');
    }
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"28px 32px", background:C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <h1 style={{ margin:0, fontSize:21, fontWeight:700, color:C.textPrimary, fontFamily:font }}>Settings</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.textMuted, fontFamily:font }}>
            Manage your profile and employee access.
          </p>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ margin:0, fontSize:12, color:C.textMuted }}>Role</p>
          <p style={{ margin:4, fontSize:14, fontWeight:700, color:C.textPrimary }}>{user?.role || 'Staff'}</p>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:20, marginBottom:24 }}>
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:24 }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.textPrimary, fontFamily:font }}>Profile</h2>
          <p style={{ margin:"10px 0 18px", color:C.textMuted, fontSize:13, fontFamily:font }}>Update your personal information and password.</p>
          {statusMessage && <div style={{ marginBottom:16 }}><Alert type={statusMessage.toLowerCase().includes('failed') ? 'error' : 'success'}>{statusMessage}</Alert></div>}
          <form onSubmit={submitProfile}>
            <div style={{ display:"grid", gap:14 }}>
              <Field label="Display name">
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </Field>
              <Field label="Username">
                <Input value={username} onChange={e => setUsername(e.target.value)} />
              </Field>
              <Field label="Avatar URL">
                <Input value={avatarUrl || ''} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="New password">
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </Field>
              <Field label="Confirm password">
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </Field>
              <Btn primary full disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Btn>
            </div>
          </form>
        </div>

        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
            <div style={{ width:56, height:56, borderRadius:12, background:C.maroonBtn, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:18, fontWeight:700 }}>
              {user?.username?.[0]?.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.textPrimary, fontFamily:font }}>{user?.username || user?.full_name || user?.email}</p>
              <p style={{ margin:2, fontSize:12, color:C.textMuted, fontFamily:font }}>{user?.email}</p>
              <p style={{ margin:2, fontSize:12, color:C.textMuted, fontFamily:font }}>Role: {user?.role || 'Staff'}</p>
            </div>
          </div>
          <p style={{ margin:0, fontSize:12, color:C.textMuted, lineHeight:1.6 }}>Your profile is visible in the system. Only administrators can change employee roles from the employee list below.</p>
        </div>
      </div>

      {user?.role === 'Admin' && (
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:24 }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.textPrimary, fontFamily:font }}>Employee access</h2>
          <p style={{ margin:"8px 0 18px", color:C.textMuted, fontSize:13, fontFamily:font }}>Admins can view every employee and change their role.</p>
          {loadingEmployees ? (
            <p style={{ color:C.textMuted }}>Loading employee list…</p>
          ) : (
            <div style={{ display:"grid", gap:12 }}>
              {employees.map(emp => (
                <div key={emp.id} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:14, alignItems:"center", padding:14, borderRadius:12, background:C.rowAlt }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:C.maroonMid, color:C.white, display:"grid", placeItems:"center", fontWeight:700 }}>{(emp.username || emp.full_name || emp.email || '?')[0].toUpperCase()}</div>
                    <div>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.textPrimary }}>{emp.full_name}</p>
                      <p style={{ margin:2, fontSize:12, color:C.textMuted }}>{emp.email}</p>
                    </div>
                  </div>
                  <div>
                    <select value={emp.role} onChange={e => changeEmployeeRole(emp.id, e.target.value)} style={{ padding:"8px 10px", borderRadius:10, border:`1px solid ${C.border}`, fontFamily:font, fontSize:12, background:C.white, color:C.textPrimary }}>
                      <option>Staff</option>
                      <option>Admin</option>
                    </select>
                  </div>
                </div>
              ))}
              {employees.length === 0 && <p style={{ margin:0, color:C.textMuted }}>No employees found.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── SIDEBAR ────────────────────────────────────────────────── */
const Sidebar = ({ onLogout, user, selectedPage, onSelectPage }) => (
  <div style={{ width:230, background:C.maroonDeep, display:"flex", flexDirection:"column", flexShrink:0 }}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <div style={{ padding:"20px 16px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:C.maroonBtn,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:15, fontWeight:700, color:C.white, fontFamily:font }}>O</div>
        <div>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white, fontFamily:font }}>OTTO SHOES</p>
          <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)", fontFamily:font }}>CutWise IMS</p>
        </div>
      </div>
    </div>

    <nav style={{ flex:1, paddingTop:8 }}>
      {[
        { icon:"🚚", label:"Delivery", key:"Delivery", enabled:true },
        { icon:"⚙️", label:"Settings", key:"Settings", enabled:true },
        { icon:"📈", label:"Sales", key:"Sales", enabled:false },
        { icon:"📦", label:"Inventory", key:"Inventory", enabled:false },
      ].map(({ icon, label, key, enabled }) => {
        const active = selectedPage === key;
        return (
          <div key={key} onClick={() => enabled && onSelectPage(key)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
            borderRadius:8, margin:"1px 8px", cursor: enabled ? "pointer" : "not-allowed",
            background: active ? C.maroonMid : "transparent",
            color: active ? C.white : enabled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
            fontSize:13, fontFamily:font,
          }}>
            <span style={{ fontSize:15 }}>{icon}</span>
            {label}
            {!enabled && <span style={{ fontSize:10, marginLeft:"auto", opacity:0.4 }}>Coming</span>}
          </div>
        );
      })}
    </nav>

    <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", background:C.maroonMid,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, color:C.white, fontWeight:700 }}>
          {(user?.username || user?.full_name || user?.email || "U")[0].toUpperCase()}
        </div>
        <div style={{ flex:1, overflow:"hidden" }}>
          <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.white, fontFamily:font }}>{user?.username || user?.full_name || 'OTTO Employee'}</p>
          <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)", fontFamily:font,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.role || 'Staff'}</p>
        </div>
      </div>
      <button onClick={onLogout} style={{
        width:"100%", padding:"7px", borderRadius:6, border:"1px solid rgba(255,255,255,0.15)",
        background:"transparent", color:"rgba(255,255,255,0.6)", cursor:"pointer",
        fontSize:12, fontFamily:font, fontWeight:500,
      }}>Sign Out</button>
    </div>
  </div>
);

/* ─── ROOT APP ───────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('Delivery');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('otto_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('otto_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem('otto_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    localStorage.removeItem('otto_user');
    setUser(null);
  };

  const handleProfileUpdated = (updated) => {
    setUser(updated);
    localStorage.setItem('otto_user', JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", background:C.cream, fontFamily:font }}>
        <p style={{ color:C.textMuted, fontSize:14 }}>Loading CutWise IMS…</p>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const renderPage = () => {
    if (page === 'Settings') return <SettingsPage user={user} onProfileUpdated={handleProfileUpdated} />;
    if (page === 'Delivery') return <DeliveryDashboard user={user} />;
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'32px', background:C.cream }}>
        <h1 style={{ margin:0, fontSize:24, color:C.textPrimary, fontFamily:font }}>Coming soon</h1>
        <p style={{ marginTop:12, color:C.textMuted, fontFamily:font }}>This subsystem is not yet available in the current release.</p>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:font }}>
      <Sidebar user={user} onLogout={handleLogout} selectedPage={page} onSelectPage={setPage} />
      {renderPage()}
    </div>
  );
}
