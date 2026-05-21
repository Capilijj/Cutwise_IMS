import { useState } from "react";
import Sidebar from "./components/Sidebar";
import SalesForm from "./components/SalesForm";
import TransactionHistory from "./components/TransactionsTable";

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

const font = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

function genId(len) {
  return `TXN-2026-${String(len + 1).padStart(3, "0")}`;
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div style={{
      backgroundColor: C.creamCard,
      borderRadius: 14,
      padding: "22px 24px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
      border: `1px solid ${C.creamBorder}`,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      transition: "box-shadow 0.2s, transform 0.2s",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${C.maroonDark}, ${C.maroonBtn})`,
        borderRadius: "14px 14px 0 0",
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "0.68rem", color: C.textLight, fontFamily: fontSans,
          textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "600",
        }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `linear-gradient(135deg, ${C.maroonMid}, ${C.maroonBtn})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: `0 3px 10px rgba(139,37,37,0.28)`,
        }}>{icon}</div>
      </div>
      <div>
        <div style={{
          fontSize: "clamp(1.55rem, 3vw, 1.9rem)",
          fontWeight: "700",
          color: C.textDark,
          fontFamily: font,
          lineHeight: 1,
          letterSpacing: "-0.5px",
        }}>{value}</div>
        {sub && (
          <div style={{
            fontSize: "0.72rem", color: C.textLight,
            fontFamily: fontSans, marginTop: 6,
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const styles = {
    success: { bg: C.successBg, color: C.success, border: "#2E8B4730" },
    warning: { bg: C.warningBg, color: C.warning, border: "#D4A01730" },
    error:   { bg: C.errorBg,   color: C.error,   border: "#C0392B30" },
  };
  const s = styles[type] || styles.success;
  const icons = { success: "✓", warning: "⚠", error: "✕" };
  return (
    <div style={{
      padding: "12px 18px", borderRadius: 9, marginBottom: 20,
      backgroundColor: s.bg, color: s.color,
      fontFamily: fontSans, fontWeight: "600", fontSize: "0.875rem",
      display: "flex", alignItems: "center", gap: 10,
      border: `1px solid ${s.border}`,
      animation: "slideDown 0.3s ease",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icons[type] || "✓"}</span>
      {msg}
    </div>
  );
}

const StatIcons = {
  revenue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v20M8 7h6a3 3 0 0 1 0 6H8m0 2h7" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

function SalesAnalyticsGraph({ transactions }) {
  const dayTotals = transactions.reduce((acc, txn) => {
    const dateKey = txn.timestamp.split(" ")[0];
    acc[dateKey] = (acc[dateKey] || 0) + txn.total;
    return acc;
  }, {});

  const sortedDates = Object.keys(dayTotals).sort();
  const points = sortedDates.slice(-7).map((date) => ({
    label: date.split("-").slice(1).join("/"),
    value: dayTotals[date],
  }));

  const maxValue = Math.max(...points.map((item) => item.value), 1);

  return (
    <div style={{
      backgroundColor: C.creamDim,
      borderRadius: 16,
      padding: "22px 22px 18px",
      border: `1px solid ${C.creamBorder}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", color: C.maroonMid, fontFamily: font, fontWeight: "bold" }}>
            Revenue Trend
          </h3>
          <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: C.textLight, fontFamily: fontSans }}>
            Last {points.length} days sales movement.
          </p>
        </div>
        <span style={{ fontSize: "0.78rem", color: C.textMid, fontFamily: fontSans }}>
          ₱ {transactions.reduce((sum, txn) => sum + txn.total, 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {points.length === 0 ? (
        <div style={{ padding: "38px 0", textAlign: "center", color: C.textLight, fontFamily: fontSans }}>
          Add sales to see analytics here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 12, alignItems: "end", minHeight: 150 }}>
          {points.map((point) => (
            <div key={point.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                width: "100%",
                minHeight: 20,
                height: `${Math.max(40, (point.value / maxValue) * 140)}px`,
                borderRadius: 14,
                background: `linear-gradient(180deg, ${C.maroonBtn}, ${C.maroonMid})`,
                boxShadow: "0 8px 18px rgba(139,37,37,0.18)",
                transition: "height 0.25s ease",
              }} />
              <span style={{ fontSize: "0.72rem", color: C.textMid, fontFamily: fontSans, textAlign: "center" }}>{point.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesManagementApp() {
  const [transactions, setTransactions] = useState([]);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [activeNav, setActiveNav] = useState("sales");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  };

  const handleSave = (data) => {
    const newTxn = { id: genId(transactions.length), ...data, timestamp: now() };
    setTransactions((prev) => [newTxn, ...prev]);
    showToast(`Transaction ${newTxn.id} saved and recorded.`, "success");
  };

  const handleUpdate = (id, updates) => {
    setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, ...updates } : txn)));
    showToast(`Transaction ${id} updated successfully.`, "success");
  };

  const handleDelete = (id) => {
    setTransactions((prev) => prev.filter((txn) => txn.id !== id));
    showToast(`Transaction ${id} removed.`, "warning");
  };

  const totalRevenue = transactions.reduce((sum, txn) => sum + txn.total, 0);
  const completedCount = transactions.filter((txn) => txn.status === "Completed").length;
  const pendingCount = transactions.filter((txn) => txn.status === "Pending").length;

  const pageHeaders = {
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "Fast insights for Otto Shoes sales operations.",
    },
    sales: {
      title: "Record New Sale",
      subtitle: "Create a new sales transaction with ease.",
    },
    history: {
      title: "Transaction History",
      subtitle: "Review and edit saved sales records.",
    },
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      backgroundColor: C.cream,
      fontFamily: fontSans,
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        input:focus, select:focus {
          border-color: ${C.maroonBtn} !important;
          box-shadow: 0 0 0 3px rgba(139,37,37,0.1);
        }
        button:hover { opacity: 0.92; }
        .page-card {
          background: ${C.creamCard};
          border-radius: 18px;
          border: 1px solid ${C.creamBorder};
          box-shadow: 0 2px 18px rgba(0,0,0,0.08);
          padding: 28px;
        }
        .main-content {
          flex: 1;
          padding: 36px 40px;
          overflow-y: auto;
          min-width: 0;
        }
        .stats-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 24px;
        }
        .center-panel {
          max-width: 760px;
          margin: 0 auto;
        }
        .full-panel {
          width: 100%;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .main-content {
            padding: 76px 18px 24px;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Sidebar active={activeNav} onNav={setActiveNav} />

      <main className="main-content">
        <header style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                fontFamily: font,
                color: C.textDark,
                fontWeight: "800",
                lineHeight: 1.1,
              }}>
                {pageHeaders[activeNav].title}
              </h1>
              <p style={{
                margin: "10px 0 0",
                color: C.textLight,
                fontSize: "0.92rem",
                fontFamily: fontSans,
                maxWidth: 620,
                lineHeight: 1.6,
              }}>
                {pageHeaders[activeNav].subtitle}
              </p>
            </div>
            <div style={{
              padding: "10px 18px",
              borderRadius: 20,
              background: C.creamCard,
              border: `1px solid ${C.creamBorder}`,
              fontSize: "0.79rem",
              color: C.textMid,
              fontFamily: fontSans,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}>
              {new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}
            </div>
          </div>
        </header>

        <Toast msg={toast.msg} type={toast.type} />

        {activeNav === "dashboard" && (
          <div className="page-card">
            <div className="stats-grid">
              <StatCard
                label="Total Revenue"
                value={`₱ ${totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub={`${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
                icon={StatIcons.revenue}
              />
              <StatCard
                label="Completed Sales"
                value={completedCount}
                sub="successfully recorded"
                icon={StatIcons.check}
              />
              <StatCard
                label="Pending Orders"
                value={pendingCount}
                sub="awaiting confirmation"
                icon={StatIcons.clock}
              />
            </div>

            <div style={{ marginTop: 26 }}>
              <SalesAnalyticsGraph transactions={transactions} />
            </div>
          </div>
        )}

        {activeNav === "sales" && (
          <div className="page-card center-panel">
            <SalesForm onSave={handleSave} />
          </div>
        )}

        {activeNav === "history" && (
          <div className="page-card full-panel">
            <TransactionHistory
              transactions={transactions}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </div>
        )}
      </main>
    </div>
  );
}
