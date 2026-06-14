import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Dashboard/Sidebar";
import SalesForm from "./Dashboard/SalesForm";
import SettingsPage from "./Dashboard/SettingsPage";
import TransactionHistory from "./Dashboard/TransactionHistory";
import { useAuth } from "../contexts/AuthContext";
import { leatherAPI, sizeAPI, transactionAPI } from "../services/api";

const C = {
  maroonDark: "#1C0606",
  maroonMid: "#6B1C1C",
  maroonBtn: "#8B2525",
  maroonLight: "#B03A3A",
  cream: "#FAF8F5",
  creamCard: "#FFFFFF",
  creamBorder: "#EDE8E1",
  creamDim: "#F5F2EE",
  textDark: "#1C0606",
  textMid: "#4A3030",
  textLight: "#8C7A7A",
  success: "#1A6B2A",
  successBg: "#E6F4EA",
  warning: "#7A5200",
  warningBg: "#FEF3D7",
  error: "#B00020",
  errorBg: "#FDECEA",
  gold: "#C9A84C",
};

const font = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

export default function SalesManagementApp() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [leatherTypes, setLeatherTypes] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [activeNav, setActiveNav] = useState("sales");
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [deletingTxn, setDeletingTxn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4000);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [lt, st, txns] = await Promise.all([
          leatherAPI.list(),
          sizeAPI.list(),
          transactionAPI.list(),
        ]);
        if (!mounted) return;
        setLeatherTypes(lt.map((l) => ({ id: l.id, value: l.name, tag: l.tag ?? "", photo: l.photo_url ?? "" })));
        setSizeTypes(st.map((s) => ({ id: s.id, value: s.name, unit: s.unit || "sqr" })));

        setTransactions(txns);
      } catch (err) {
        if (!mounted) return;
        showToast(`Failed to load data: ${err.message}`, "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const handleSave = async (data) => {
    try {
      const leatherObj = leatherTypes.find((t) => t.value === data.itemType);
      if (!leatherObj) {
        showToast("Save failed: Please select a valid leather type.", "error");
        return;
      }
      const sizeIdNum = parseInt(data.sizeId, 10);
      if (!data.sizeId || Number.isNaN(sizeIdNum)) {
        showToast("Save failed: Please select a valid size type.", "error");
        return;
      }

      const payload = {
        customer_name: data.customer,
        leather_type: leatherObj.id,
        leather_name_snapshot: data.itemType,
        size_type: sizeIdNum,
        size_snapshot: data.size,
        quantity_kg: data.quantity,
        unit_price: data.unitPrice,
        item_description: data.item_description,
        delivery_address: data.delivery_address,
        scheduled_at: data.scheduled_at,
        is_pickup: data.is_pickup ?? false,
        status: "Pending",
      };

      const saved = await transactionAPI.create(payload);
      setTransactions((prev) => [saved, ...prev]);
      showToast(`Transaction ${saved.id} saved successfully.`, "success");
      setShowForm(false);
    } catch (err) {
      showToast(`Save failed: ${err.message}`, "error");
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const updated = await transactionAPI.update(editingTxn.id, data);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Transaction ${updated.id} updated.`, "success");
      setEditingTxn(null);
    } catch (err) {
      showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transactionAPI.remove(deletingTxn.id);
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTxn.id));
      showToast(`Transaction ${deletingTxn.id} deleted from view.`, "warning");
      setDeletingTxn(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddLeatherType = async (newType) => {
    try {
      const saved = await leatherAPI.create({ name: newType.value, tag: newType.tag, photo_url: newType.photo });
      setLeatherTypes((prev) => [...prev, { id: saved.id, value: saved.name, tag: saved.tag ?? "", photo: saved.photo_url ?? "" }]);
      showToast(`Leather type "${saved.name}" added.`, "success");
    } catch (err) {
      showToast(`Add failed: ${err.message}`, "error");
    }
  };

  const handleUpdateLeatherType = async (index, updatedType) => {
    const existing = leatherTypes[index];
    try {
      const saved = await leatherAPI.update(existing.id, { name: updatedType.value, tag: updatedType.tag, photo_url: updatedType.photo });
      setLeatherTypes((prev) => prev.map((item, idx) => (idx === index ? { id: saved.id, value: saved.name, tag: saved.tag ?? "", photo: saved.photo_url ?? "" } : item)));
      showToast(`Leather type "${saved.name}" updated.`, "success");
    } catch (err) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  const handleDeleteLeatherType = async (index) => {
    const existing = leatherTypes[index];
    try {
      await leatherAPI.remove(existing.id);
      setLeatherTypes((prev) => prev.filter((_, idx) => idx !== index));
      showToast(`Leather type "${existing.value}" deleted.`, "warning");
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  const handleAddSizeType = async (newSize) => {
    try {
      const saved = await sizeAPI.create({ name: newSize });
      setSizeTypes((prev) => [...prev, { id: saved.id, value: saved.name }]);
      showToast(`Size type "${saved.name}" added.`, "success");
    } catch (err) {
      showToast(`Add failed: ${err.message}`, "error");
    }
  };

  const handleUpdateSizeType = async (index, updatedSize) => {
    const existing = sizeTypes[index];
    try {
      const saved = await sizeAPI.update(existing.id, { name: updatedSize });
      setSizeTypes((prev) => prev.map((item, idx) => (idx === index ? { id: saved.id, value: saved.name } : item)));
      showToast(`Size type "${saved.name}" updated.`, "success");
    } catch (err) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  const handleDeleteSizeType = async (index) => {
    const existing = sizeTypes[index];
    try {
      await sizeAPI.remove(existing.id);
      setSizeTypes((prev) => prev.filter((_, idx) => idx !== index));
      showToast(`Size type "${existing.value}" deleted.`, "warning");
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  const sizeLabels = sizeTypes;
  const role = (user?.role || "sales_clerk").toLowerCase();
  const canCreate = role === "admin" || role === "sales_clerk";
  const canEdit = role === "admin" || role === "supervisor";
  const canDelete = role === "admin";
  const canManageSettings = role === "admin" || role === "supervisor";

  const pageHeaders = {
    sales: {
      title: showForm ? "New Transaction" : "Sales Entry",
      subtitle: showForm ? "Fill in the details below to record a new sale." : "Overview of your sales transactions.",
    },
    settings: {
      title: "Settings",
      subtitle: "Add leather and size types for Sales Management.",
    },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", backgroundColor: C.cream, fontFamily: fontSans }}>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: ${C.maroonBtn} !important; box-shadow: 0 0 0 3px rgba(139,37,37,0.1); }
        .main-content { flex: 1; padding: 36px 40px; overflow-y: auto; min-width: 0; }
        .page-card { background: ${C.creamCard}; border-radius: 18px; border: 1px solid ${C.creamBorder}; box-shadow: 0 2px 18px rgba(0,0,0,0.08); overflow: hidden; animation: fadeIn 0.25s ease; }
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } .sales-split { grid-template-columns: 1fr !important; } .order-panel { border-left: none !important; border-top: 1px solid ${C.creamBorder} !important; } }
        @media (max-width: 760px) { .main-content { padding: 76px 18px 24px; } .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <Sidebar active={activeNav} onNav={(key) => { setActiveNav(key); setShowForm(false); }} />

      <main className="main-content">
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {activeNav === "sales" && showForm && (
                <button onClick={() => setShowForm(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: C.creamCard, border: `1px solid ${C.creamBorder}`, color: C.textMid, cursor: "pointer", fontFamily: fontSans, fontSize: "0.8rem", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  Back
                </button>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontFamily: font, color: C.textDark, fontWeight: "800", lineHeight: 1.1 }}>{pageHeaders[activeNav].title}</h1>
                <p style={{ margin: "8px 0 0", color: C.textLight, fontSize: "0.88rem", fontFamily: fontSans, lineHeight: 1.6 }}>{pageHeaders[activeNav].subtitle}</p>
              </div>
            </div>
            <div style={{ padding: "10px 18px", borderRadius: 20, background: C.creamCard, border: `1px solid ${C.creamBorder}`, fontSize: "0.79rem", color: C.textMid, fontFamily: fontSans, whiteSpace: "nowrap", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>{new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</div>
          </div>
        </header>

        {loading && <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontFamily: fontSans }}>Loading…</div>}

        {!loading && activeNav === "sales" && (
          <>
            {!showForm && (
              <TransactionHistory
                transactions={transactions}
                leatherTypes={leatherTypes}
                sizeTypes={sizeLabels}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                onNewTransaction={() => setShowForm(true)}
                onEdit={(txn) => setEditingTxn(txn)}
                onDelete={(txn) => setDeletingTxn(txn)}
                editingTxn={editingTxn}
                deletingTxn={deletingTxn}
                onSaveEdit={handleUpdate}
                onCloseEdit={() => setEditingTxn(null)}
                saving={saving}
                onConfirmDelete={handleDelete}
                onCloseDelete={() => setDeletingTxn(null)}
                deleting={deleting}
                toast={toast}
              />
            )}

            {showForm && (
              <div className="page-card">
                <SalesForm onSave={handleSave} itemTypes={leatherTypes} sizeTypes={sizeLabels} />
              </div>
            )}
          </>
        )}

        {!loading && activeNav === "settings" && (
          <div className="page-card" style={{ padding: 28 }}>
            <SettingsPage
              leatherTypes={leatherTypes}
              sizeTypes={sizeLabels}
              canManageSettings={canManageSettings}
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
    </div>
  );
}
