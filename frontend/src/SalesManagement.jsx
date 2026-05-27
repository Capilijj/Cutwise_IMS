import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import SalesForm from "./components/SalesForm";
import SettingsPage from "./components/SettingsPage";
import { leatherAPI, sizeAPI, transactionAPI } from "./services/api";

const C = {
  maroonDark:  "#1C0606",
  maroonMid:   "#6B1C1C",
  maroonBtn:   "#8B2525",
  maroonLight: "#B03A3A",
  cream:       "#FAF8F5",
  creamCard:   "#FFFFFF",
  creamBorder: "#EDE8E1",
  creamDim:    "#F5F2EE",
  textDark:    "#1C0606",
  textMid:     "#4A3030",
  textLight:   "#8C7A7A",
  success:     "#1A6B2A",
  successBg:   "#E6F4EA",
  warning:     "#7A5200",
  warningBg:   "#FEF3D7",
  error:       "#B00020",
  errorBg:     "#FDECEA",
  gold:        "#C9A84C",
};

const font     = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

const STATUS_MAP = {
  Pending:   { bg: "#FEF3D7", color: "#7A5200",  dot: "#D4A017" },
  Completed: { bg: "#E6F4EA", color: "#1A6B2A",  dot: "#2E8B47" },
  Cancelled: { bg: "#FDECEA", color: "#8B1A1A",  dot: "#C0392B" },
};

function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: "0.68rem", fontFamily: fontSans, fontWeight: "600",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const styles = {
    success: { bg: C.successBg, color: C.success, border: "#2E8B4730" },
    warning: { bg: C.warningBg, color: C.warning, border: "#D4A01730" },
    error:   { bg: C.errorBg,   color: C.error,   border: "#C0392B30" },
  };
  const s     = styles[type] || styles.success;
  const icons = { success: "✓", warning: "⚠", error: "✕" };
  return (
    <div style={{
      padding: "12px 18px", borderRadius: 9, marginBottom: 20,
      backgroundColor: s.bg, color: s.color,
      fontFamily: fontSans, fontWeight: "600", fontSize: "0.875rem",
      display: "flex", alignItems: "center", gap: 10,
      border: `1px solid ${s.border}`,
      animation: "slideDown 0.3s ease",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icons[type] || "✓"}</span>
      {msg}
    </div>
  );
}

// ── Edit Drawer ───────────────────────────────────────────────
function EditDrawer({ txn, leatherTypes, sizeTypes, onSave, onClose, saving }) {
  const [customer,  setCustomer]  = useState(txn.customer_name);
  const [leatherId, setLeatherId] = useState(txn.leather_type?.id ?? txn.leather_type ?? "");
  const [sizeId,    setSizeId]    = useState(txn.size_type?.id    ?? txn.size_type    ?? "");
  const [qty,       setQty]       = useState(String(txn.quantity_kg));
  const [price,     setPrice]     = useState(String(txn.unit_price));
  const [status,    setStatus]    = useState(txn.status);
  const [errors,    setErrors]    = useState({});

  const total = (parseInt(qty) || 0) * (parseFloat(price) || 0);

  const validate = () => {
    const e = {};
    if (!customer.trim())         e.customer  = "Required.";
    if (!leatherId)               e.leather   = "Required.";
    if (!sizeId)                  e.size      = "Required.";
    if (!qty || parseInt(qty) <= 0) e.qty     = "Must be > 0.";
    if (!price || parseFloat(price) <= 0) e.price = "Must be > 0.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({
      customer_name:  customer,
      leather_type:   parseInt(leatherId),
      size_type:      parseInt(sizeId),
      quantity_kg:    parseInt(qty),
      unit_price:     parseFloat(price),
      status,
    });
  };

  const fieldStyle = (errKey) => ({
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: errors[errKey] ? `1.5px solid ${C.error}` : `1px solid ${C.creamBorder}`,
    backgroundColor: errors[errKey] ? C.errorBg : "#fff",
    fontSize: "0.88rem", fontFamily: fontSans, color: C.textDark,
    outline: "none", boxSizing: "border-box",
  });

  const labelSt = {
    display: "block", marginBottom: 5,
    fontSize: "0.65rem", fontWeight: "700",
    color: C.textMid, fontFamily: fontSans,
    textTransform: "uppercase", letterSpacing: 0.8,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(28,6,6,0.45)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 401,
        background: C.creamCard,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflowY: "auto",
      }}>

        {/* Drawer header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${C.creamBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(135deg, ${C.maroonDark}, ${C.maroonMid})`,
        }}>
          <div>
            <div style={{ fontFamily: font, fontSize: "1rem", fontWeight: "700", color: "#fff" }}>
              Edit Transaction
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: fontSans, marginTop: 2 }}>
              {txn.id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, color: "#fff", cursor: "pointer",
              width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", fontFamily: fontSans,
            }}
          >✕</button>
        </div>

        {/* Fields */}
        <div style={{ padding: "22px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Customer */}
          <div>
            <label style={labelSt}>Customer Name *</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setErrors((p) => ({ ...p, customer: "" })); }}
              style={fieldStyle("customer")}
              placeholder="Client / Company Name"
            />
            {errors.customer && <span style={{ color: C.error, fontSize: "0.68rem", fontFamily: fontSans }}>{errors.customer}</span>}
          </div>

          {/* Leather type */}
          <div>
            <label style={labelSt}>Leather Type *</label>
            <select
              value={leatherId}
              onChange={(e) => { setLeatherId(e.target.value); setErrors((p) => ({ ...p, leather: "" })); }}
              style={fieldStyle("leather")}
            >
              <option value="">— Select leather —</option>
              {leatherTypes.map((l) => (
                <option key={l.id} value={l.id}>{l.value}</option>
              ))}
            </select>
            {errors.leather && <span style={{ color: C.error, fontSize: "0.68rem", fontFamily: fontSans }}>{errors.leather}</span>}
          </div>

          {/* Size type */}
          <div>
            <label style={labelSt}>Size Type *</label>
            <select
              value={sizeId}
              onChange={(e) => { setSizeId(e.target.value); setErrors((p) => ({ ...p, size: "" })); }}
              style={fieldStyle("size")}
            >
              <option value="">— Select size —</option>
              {sizeTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.value}</option>
              ))}
            </select>
            {errors.size && <span style={{ color: C.error, fontSize: "0.68rem", fontFamily: fontSans }}>{errors.size}</span>}
          </div>

          {/* Qty + Price */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelSt}>Qty (kg) *</label>
              <input
                type="number" min="1"
                value={qty}
                onChange={(e) => { setQty(e.target.value); setErrors((p) => ({ ...p, qty: "" })); }}
                style={fieldStyle("qty")}
              />
              {errors.qty && <span style={{ color: C.error, fontSize: "0.68rem", fontFamily: fontSans }}>{errors.qty}</span>}
            </div>
            <div>
              <label style={labelSt}>Unit Price *</label>
              <input
                type="number" min="0" step="0.01"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: "" })); }}
                style={fieldStyle("price")}
              />
              {errors.price && <span style={{ color: C.error, fontSize: "0.68rem", fontFamily: fontSans }}>{errors.price}</span>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelSt}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={fieldStyle("status")}
            >
              {["Pending", "Completed", "Cancelled"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Total preview */}
          <div style={{
            background: C.creamDim, borderRadius: 10,
            padding: "14px 16px",
            border: `1px solid ${C.creamBorder}`,
          }}>
            <div style={{ fontSize: "0.62rem", color: C.textLight, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: fontSans, marginBottom: 6 }}>
              Computed Total
            </div>
            <div style={{ fontFamily: font, fontSize: "1.4rem", fontWeight: "700", color: C.maroonMid }}>
              ₱ {total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.68rem", color: C.textLight, fontFamily: fontSans, marginTop: 4 }}>
              {qty || 0} kg × ₱ {parseFloat(price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "16px 24px",
          borderTop: `1px solid ${C.creamBorder}`,
          display: "flex", gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              background: C.creamDim, border: `1px solid ${C.creamBorder}`,
              color: C.textMid, fontFamily: fontSans, fontWeight: "600",
              fontSize: "0.85rem", cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "11px 0", borderRadius: 10,
              background: saving
                ? "#ccc"
                : `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonDark})`,
              border: "none", color: "#fff",
              fontFamily: fontSans, fontWeight: "700",
              fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 4px 14px rgba(139,37,37,0.3)",
              transition: "opacity 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────
function DeleteModal({ txn, onConfirm, onClose, deleting }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(28,6,6,0.5)", animation: "fadeIn 0.2s ease" }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 501,
        background: C.creamCard,
        borderRadius: 16, padding: "28px 32px",
        width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "slideDown 0.25s ease",
        fontFamily: fontSans,
      }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: C.errorBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div style={{ fontFamily: font, fontSize: "1.05rem", fontWeight: "700", color: C.textDark, marginBottom: 8 }}>
          Delete Transaction?
        </div>
        <div style={{ fontSize: "0.82rem", color: C.textMid, lineHeight: 1.6, marginBottom: 22 }}>
          <strong>{txn.id}</strong> — {txn.customer_name} will be soft-deleted (marked cancelled, hidden from view).
          This cannot be undone from the UI.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 9,
              background: C.creamDim, border: `1px solid ${C.creamBorder}`,
              color: C.textMid, fontWeight: "600", fontSize: "0.85rem", cursor: "pointer",
            }}
          >Keep</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 9,
              background: deleting ? "#ccc" : C.error,
              border: "none", color: "#fff",
              fontWeight: "700", fontSize: "0.85rem",
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >{deleting ? "Deleting…" : "Yes, Delete"}</button>
        </div>
      </div>
    </>
  );
}

// ── Sales Landing (with CRUD actions) ────────────────────────
function SalesLanding({ transactions, leatherTypes, sizeTypes, onNewTransaction, onEdit, onDelete }) {
  const latest = transactions.filter((t) => t.status !== "Cancelled").slice(0, 10);

  const totalSales   = transactions.filter((t) => t.status !== "Cancelled").length;
  const totalRevenue = transactions
    .filter((t) => t.status !== "Cancelled")
    .reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
  const pending = transactions.filter((t) => t.status === "Pending").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }} className="stats-grid">
        {[
          { label: "Total Transactions", value: totalSales, icon: "🧾" },
          {
            label: "Total Revenue",
            value: `₱ ${totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
            icon: "💰",
          },
          { label: "Pending", value: pending, icon: "⏳" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: C.creamCard, border: `1px solid ${C.creamBorder}`,
            borderRadius: 16, padding: "20px 24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 1.5, color: C.textLight, fontFamily: fontSans, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: C.textDark, fontFamily: font }}>{value}</div>
          </div>
        ))}
      </div>

      {/* New Transaction button */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onNewTransaction}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 12,
            background: `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonDark})`,
            color: "#fff", border: "none", cursor: "pointer",
            fontFamily: fontSans, fontWeight: "700", fontSize: "0.9rem", letterSpacing: 0.5,
            boxShadow: "0 4px 16px rgba(139,37,37,0.35)",
            transition: "opacity 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1";   e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Transaction
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: C.creamCard, borderRadius: 18,
        border: `1px solid ${C.creamBorder}`,
        boxShadow: "0 2px 18px rgba(0,0,0,0.06)", overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${C.creamBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontFamily: font, fontSize: "1rem", fontWeight: "700", color: C.textDark }}>
            Recent Transactions
          </div>
          <div style={{ fontSize: "0.72rem", color: C.textLight, fontFamily: fontSans }}>
            Showing last {Math.min(10, latest.length)} of {totalSales}
          </div>
        </div>

        {latest.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: C.textLight, fontFamily: fontSans, fontSize: "0.88rem" }}>
            No transactions yet. Click <strong>New Transaction</strong> to record your first sale.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontSans, fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: C.creamDim }}>
                  {["TXN ID", "Customer", "Leather Type", "Size", "Qty (kg)", "Unit Price", "Total", "Status", "Actions"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: h === "Actions" ? "center" : "left",
                      color: C.textLight, fontWeight: "700",
                      fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: 1.2,
                      borderBottom: `1px solid ${C.creamBorder}`,
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {latest.map((txn, i) => (
                  <tr
                    key={txn.id}
                    style={{
                      borderBottom: i < latest.length - 1 ? `1px solid ${C.creamBorder}` : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.creamDim; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <td style={{ padding: "12px 14px", color: C.maroonBtn, fontWeight: "700", whiteSpace: "nowrap" }}>{txn.id}</td>
                    <td style={{ padding: "12px 14px", color: C.textDark }}>{txn.customer_name}</td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>{txn.leather_name_snapshot}</td>
                    <td style={{ padding: "12px 14px", color: C.textMid }}>{txn.size_snapshot}</td>
                    <td style={{ padding: "12px 14px", color: C.textDark, textAlign: "right" }}>{txn.quantity_kg}</td>
                    <td style={{ padding: "12px 14px", color: C.textDark, textAlign: "right", whiteSpace: "nowrap" }}>
                      ₱ {parseFloat(txn.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.maroonMid, fontWeight: "700", textAlign: "right", whiteSpace: "nowrap" }}>
                      ₱ {parseFloat(txn.total_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <StatusPill status={txn.status} />
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {/* Edit */}
                      <button
                        onClick={() => onEdit(txn)}
                        title="Edit transaction"
                        style={{
                          background: "#EEF2FF", border: "1px solid #C7D2FE",
                          borderRadius: 7, color: "#3730A3",
                          width: 30, height: 30, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          marginRight: 6, transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#C7D2FE"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#EEF2FF"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => onDelete(txn)}
                        title="Delete transaction"
                        style={{
                          background: C.errorBg, border: `1px solid #FECACA`,
                          borderRadius: 7, color: C.error,
                          width: 30, height: 30, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#FECACA"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = C.errorBg; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function SalesManagementApp() {
  const [transactions,  setTransactions]  = useState([]);
  const [leatherTypes,  setLeatherTypes]  = useState([]);
  const [sizeTypes,     setSizeTypes]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ msg: "", type: "success" });
  const [activeNav,     setActiveNav]     = useState("sales");
  const [showForm,      setShowForm]      = useState(false);

  // ── Edit / Delete state ───────────────────────────────────
  const [editingTxn,    setEditingTxn]   = useState(null);   // txn object being edited
  const [deletingTxn,   setDeletingTxn]  = useState(null);   // txn object to delete
  const [saving,        setSaving]       = useState(false);
  const [deleting,      setDeleting]     = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [lt, st, txns] = await Promise.all([
          leatherAPI.list(),
          sizeAPI.list(),
          transactionAPI.list(),
        ]);
        setLeatherTypes(lt.map((l) => ({ id: l.id, value: l.name, tag: l.tag ?? "", photo: l.photo_url ?? "" })));
        setSizeTypes(st.map((s) => ({ id: s.id, value: s.name })));
        setTransactions(txns);
      } catch (err) {
        showToast(`Failed to load data: ${err.message}`, "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // ── Create ────────────────────────────────────────────────
  const handleSave = async (data) => {
    try {
      const leatherObj = leatherTypes.find((t) => t.value === data.itemType);
      if (!leatherObj) { showToast("Save failed: Please select a valid leather type.", "error"); return; }
      const sizeIdNum = parseInt(data.sizeId);
      if (!data.sizeId || isNaN(sizeIdNum)) { showToast("Save failed: Please select a valid size type.", "error"); return; }
      const payload = {
        customer_name:         data.customer,
        leather_type:          leatherObj.id,
        leather_name_snapshot: data.itemType,
        size_type:             sizeIdNum,
        size_snapshot:         data.size,
        quantity_kg:           data.quantity,
        unit_price:            data.unitPrice,
        status:                "Pending",
      };
      const saved = await transactionAPI.create(payload);
      setTransactions((prev) => [saved, ...prev]);
      showToast(`Transaction ${saved.id} saved successfully.`, "success");
      setShowForm(false);
    } catch (err) {
      showToast(`Save failed: ${err.message}`, "error");
    }
  };

  // ── Update ────────────────────────────────────────────────
  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const updated = await transactionAPI.update(editingTxn.id, data);
      setTransactions((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      showToast(`Transaction ${updated.id} updated.`, "success");
      setEditingTxn(null);
    } catch (err) {
      showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Soft Delete — sets status to "Cancelled" ─────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Soft delete: patch status to Cancelled instead of destroying record
      const updated = await transactionAPI.update(deletingTxn.id, { status: "Cancelled" });
      setTransactions((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      showToast(`Transaction ${deletingTxn.id} cancelled (soft delete).`, "warning");
      setDeletingTxn(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Leather CRUD ──────────────────────────────────────────
  const handleAddLeatherType = async (newType) => {
    try {
      const saved = await leatherAPI.create({ name: newType.value, tag: newType.tag, photo_url: newType.photo });
      setLeatherTypes((prev) => [...prev, { id: saved.id, value: saved.name, tag: saved.tag ?? "", photo: saved.photo_url ?? "" }]);
      showToast(`Leather type "${saved.name}" added.`, "success");
    } catch (err) { showToast(`Add failed: ${err.message}`, "error"); }
  };

  const handleUpdateLeatherType = async (index, updatedType) => {
    const existing = leatherTypes[index];
    try {
      const saved = await leatherAPI.update(existing.id, { name: updatedType.value, tag: updatedType.tag, photo_url: updatedType.photo });
      setLeatherTypes((prev) => prev.map((item, idx) => idx === index ? { id: saved.id, value: saved.name, tag: saved.tag ?? "", photo: saved.photo_url ?? "" } : item));
      showToast(`Leather type "${saved.name}" updated.`, "success");
    } catch (err) { showToast(`Update failed: ${err.message}`, "error"); }
  };

  const handleDeleteLeatherType = async (index) => {
    const existing = leatherTypes[index];
    try {
      await leatherAPI.remove(existing.id);
      setLeatherTypes((prev) => prev.filter((_, idx) => idx !== index));
      showToast(`Leather type "${existing.value}" deleted.`, "warning");
    } catch (err) { showToast(`Delete failed: ${err.message}`, "error"); }
  };

  // ── Size CRUD ─────────────────────────────────────────────
  const handleAddSizeType = async (newSize) => {
    try {
      const saved = await sizeAPI.create({ name: newSize });
      setSizeTypes((prev) => [...prev, { id: saved.id, value: saved.name }]);
      showToast(`Size type "${saved.name}" added.`, "success");
    } catch (err) { showToast(`Add failed: ${err.message}`, "error"); }
  };

  const handleUpdateSizeType = async (index, updatedSize) => {
    const existing = sizeTypes[index];
    try {
      const saved = await sizeAPI.update(existing.id, { name: updatedSize });
      setSizeTypes((prev) => prev.map((item, idx) => idx === index ? { id: saved.id, value: saved.name } : item));
      showToast(`Size type "${saved.name}" updated.`, "success");
    } catch (err) { showToast(`Update failed: ${err.message}`, "error"); }
  };

  const handleDeleteSizeType = async (index) => {
    const existing = sizeTypes[index];
    try {
      await sizeAPI.remove(existing.id);
      setSizeTypes((prev) => prev.filter((_, idx) => idx !== index));
      showToast(`Size type "${existing.value}" deleted.`, "warning");
    } catch (err) { showToast(`Delete failed: ${err.message}`, "error"); }
  };

  const sizeLabels = sizeTypes;

  const pageHeaders = {
    sales: {
      title:    showForm ? "New Transaction"  : "Sales Entry",
      subtitle: showForm ? "Fill in the details below to record a new sale." : "Overview of your sales transactions.",
    },
    settings: {
      title:    "Settings",
      subtitle: "Add leather and size types for Sales Management.",
    },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", backgroundColor: C.cream, fontFamily: fontSans }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus {
          border-color: ${C.maroonBtn} !important;
          box-shadow: 0 0 0 3px rgba(139,37,37,0.1);
        }
        .main-content { flex: 1; padding: 36px 40px; overflow-y: auto; min-width: 0; }
        .page-card {
          background: ${C.creamCard};
          border-radius: 18px;
          border: 1px solid ${C.creamBorder};
          box-shadow: 0 2px 18px rgba(0,0,0,0.08);
          overflow: hidden;
          animation: fadeIn 0.25s ease;
        }
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .sales-split { grid-template-columns: 1fr !important; }
          .order-panel { border-left: none !important; border-top: 1px solid ${C.creamBorder} !important; }
        }
        @media (max-width: 760px) {
          .main-content { padding: 76px 18px 24px; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Sidebar active={activeNav} onNav={(key) => { setActiveNav(key); setShowForm(false); }} />

      <main className="main-content">
        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {activeNav === "sales" && showForm && (
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10,
                    background: C.creamCard, border: `1px solid ${C.creamBorder}`,
                    color: C.textMid, cursor: "pointer",
                    fontFamily: fontSans, fontSize: "0.8rem", fontWeight: "600",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontFamily: font, color: C.textDark, fontWeight: "800", lineHeight: 1.1 }}>
                  {pageHeaders[activeNav].title}
                </h1>
                <p style={{ margin: "8px 0 0", color: C.textLight, fontSize: "0.88rem", fontFamily: fontSans, lineHeight: 1.6 }}>
                  {pageHeaders[activeNav].subtitle}
                </p>
              </div>
            </div>
            <div style={{
              padding: "10px 18px", borderRadius: 20,
              background: C.creamCard, border: `1px solid ${C.creamBorder}`,
              fontSize: "0.79rem", color: C.textMid, fontFamily: fontSans,
              whiteSpace: "nowrap", boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}>
              {new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}
            </div>
          </div>
        </header>

        <Toast msg={toast.msg} type={toast.type} />

        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontFamily: fontSans }}>
            Loading…
          </div>
        )}

        {/* Sales Entry */}
        {!loading && activeNav === "sales" && (
          <>
            {!showForm && (
              <SalesLanding
                transactions={transactions}
                leatherTypes={leatherTypes}
                sizeTypes={sizeLabels}
                onNewTransaction={() => setShowForm(true)}
                onEdit={(txn) => setEditingTxn(txn)}
                onDelete={(txn) => setDeletingTxn(txn)}
              />
            )}

            {showForm && (
              <div className="page-card">
                <SalesForm
                  onSave={handleSave}
                  itemTypes={leatherTypes}
                  sizeTypes={sizeLabels}
                />
              </div>
            )}
          </>
        )}

        {/* Settings */}
        {!loading && activeNav === "settings" && (
          <div className="page-card" style={{ padding: 28 }}>
            <SettingsPage
              leatherTypes={leatherTypes}
              sizeTypes={sizeLabels}
              onAddLeatherType={handleAddLeatherType}
              onUpdateLeatherType={handleUpdateLeatherType}
              onDeleteLeatherType={handleDeleteLeatherType}
              onAddSizeType={handleAddSizeType}
              onUpdateSizeType={handleUpdateSizeType}
              onDeleteSizeType={handleDeleteSizeType}
            />
          </div>
        )}
      </main>

      {/* Edit Drawer */}
      {editingTxn && (
        <EditDrawer
          txn={editingTxn}
          leatherTypes={leatherTypes}
          sizeTypes={sizeLabels}
          onSave={handleUpdate}
          onClose={() => setEditingTxn(null)}
          saving={saving}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingTxn && (
        <DeleteModal
          txn={deletingTxn}
          onConfirm={handleDelete}
          onClose={() => setDeletingTxn(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}