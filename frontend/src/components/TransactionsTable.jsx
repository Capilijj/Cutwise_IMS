import { useState } from "react";

const C = {
  maroonDark:  "#1C0606",
  maroonMid:   "#6B1C1C",
  maroonBtn:   "#8B2525",
  maroonLight: "#B03A3A",
  creamCard:   "#FFFFFF",
  creamBorder: "#EDE8E1",
  creamDim:    "#F5F2EE",
  textDark:    "#1C0606",
  textMid:     "#4A3030",
  textLight:   "#8C7A7A",
  error:       "#B00020",
  errorBg:     "#FDECEA",
};

const font = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

const STATUS_OPTIONS = ["Completed", "Pending", "Cancelled"];

function Badge({ status }) {
  const map = {
    Completed: { bg: "#E6F4EA", color: "#1A6B2A", dot: "#2E8B47" },
    Pending:   { bg: "#FEF3D7", color: "#7A5200", dot: "#D4A017" },
    Cancelled: { bg: "#FDECEA", color: "#8B1A1A", dot: "#C0392B" },
  };
  const s = map[status] || map.Completed;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: "0.72rem", fontFamily: fontSans, fontWeight: "600",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

export default function TransactionHistory({ transactions, onUpdate, onDelete }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const filtered = transactions
    .filter((t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.itemType.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === "string") va = va.toLowerCase(), vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openEditor = (txn) => {
    setSelectedTxn(txn);
    setEditDraft({
      customer: txn.customer,
      itemType: txn.itemType,
      size: txn.size,
      quantity: txn.quantity.toString(),
      unitPrice: txn.unitPrice.toString(),
      status: txn.status,
    });
  };

  const closeEditor = () => {
    setSelectedTxn(null);
    setEditDraft(null);
  };

  const updateField = (field, value) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleModalSubmit = (ev) => {
    ev.preventDefault();
    if (!selectedTxn || !editDraft) return;
    const quantity = parseFloat(editDraft.quantity) || 0;
    const unitPrice = parseFloat(editDraft.unitPrice) || 0;
    onUpdate(selectedTxn.id, {
      customer: editDraft.customer,
      itemType: editDraft.itemType,
      size: editDraft.size,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      status: editDraft.status,
    });
    closeEditor();
  };

  const thStyle = (field) => ({
    padding: "11px 10px",
    textAlign: "left",
    fontSize: "0.72rem",
    fontFamily: fontSans,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottom: `2px solid ${C.creamBorder}`,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    color: sortField === field ? C.maroonMid : C.textLight,
  });

  const sortArrow = (field) => (sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  return (
    <section style={{
      backgroundColor: C.creamCard,
      borderRadius: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      border: `1px solid ${C.creamBorder}`,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `1px solid ${C.creamBorder}`,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: C.maroonMid, fontFamily: font, fontWeight: "bold" }}>
            Transaction History
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: C.textLight, fontFamily: fontSans }}>
            US-002 - {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search ID, customer, or material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: `1px solid ${C.creamBorder}`,
            fontSize: "0.87rem",
            fontFamily: fontSans,
            width: 280,
            outline: "none",
            backgroundColor: C.creamDim,
          }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: C.creamDim }}>
              <th style={thStyle("id")} onClick={() => handleSort("id")}>Txn ID{sortArrow("id")}</th>
              <th style={thStyle("customer")} onClick={() => handleSort("customer")}>Customer{sortArrow("customer")}</th>
              <th style={thStyle("itemType")} onClick={() => handleSort("itemType")}>Material{sortArrow("itemType")}</th>
              <th style={thStyle("quantity")}>Qty x Price</th>
              <th style={thStyle("total")} onClick={() => handleSort("total")}>Total{sortArrow("total")}</th>
              <th style={thStyle("timestamp")} onClick={() => handleSort("timestamp")}>Timestamp{sortArrow("timestamp")}</th>
              <th style={thStyle("status")} onClick={() => handleSort("status")}>Status{sortArrow("status")}</th>
              <th style={{ ...thStyle(""), cursor: "default" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((txn, i) => (
              <tr key={txn.id} style={{
                borderBottom: `1px solid ${C.creamBorder}`,
                backgroundColor: i % 2 === 0 ? "#fff" : C.creamDim,
                transition: "background 0.1s",
              }}>
                <td style={{ padding: "12px 10px", fontWeight: "700", color: C.maroonMid, fontFamily: fontSans, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                  {txn.id}
                </td>
                <td style={{ padding: "12px 10px", fontFamily: fontSans, fontSize: "0.85rem", color: C.textDark }}>
                  {txn.customer}
                </td>
                <td style={{ padding: "12px 10px", fontFamily: fontSans, fontSize: "0.82rem" }}>
                  <div style={{ color: C.textDark, fontWeight: "500" }}>{txn.itemType}</div>
                  <div style={{ color: C.textLight, fontSize: "0.72rem" }}>Size: {txn.size}</div>
                </td>
                <td style={{ padding: "12px 10px", fontFamily: fontSans, fontSize: "0.82rem", color: C.textMid, whiteSpace: "nowrap" }}>
                  {txn.quantity} kg @ PHP {txn.unitPrice.toFixed(2)}
                </td>
                <td style={{ padding: "12px 10px", fontWeight: "700", fontFamily: font, fontSize: "0.95rem", color: C.textDark, whiteSpace: "nowrap" }}>
                  PHP {txn.total.toFixed(2)}
                </td>
                <td style={{ padding: "12px 10px", fontFamily: fontSans, fontSize: "0.75rem", color: C.textLight, whiteSpace: "nowrap" }}>
                  {txn.timestamp}
                </td>
                <td style={{ padding: "12px 10px" }}>
                  <Badge status={txn.status} />
                </td>
                <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                  <button onClick={() => openEditor(txn)} style={{
                    padding: "5px 12px", borderRadius: 6, marginRight: 8,
                    border: `1px solid ${C.creamBorder}`, background: "#fff",
                    cursor: "pointer", fontSize: "0.78rem", fontFamily: fontSans,
                    color: C.maroonMid, fontWeight: "700",
                  }}>Edit</button>
                  <button onClick={() => onDelete(txn.id)} style={{
                    padding: "5px 12px", borderRadius: 6,
                    border: `1px solid #FDECEA`, background: "#FDECEA",
                    cursor: "pointer", fontSize: "0.78rem", fontFamily: fontSans,
                    color: C.error, fontWeight: "700",
                  }}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{
                  padding: "40px", textAlign: "center",
                  color: C.textLight, fontFamily: fontSans, fontSize: "0.88rem",
                }}>
                  No transactions match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTxn && editDraft && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 400,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }} onClick={closeEditor}>
          <div style={{
            width: "100%",
            maxWidth: 660,
            background: "#fff",
            borderRadius: 18,
            padding: 26,
            boxShadow: "0 25px 70px rgba(0,0,0,0.18)",
            position: "relative",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", color: C.maroonMid, fontFamily: font, fontWeight: "bold" }}>
                  Edit Transaction
                </h2>
                <p style={{ margin: "6px 0 0", color: C.textLight, fontFamily: fontSans, fontSize: "0.85rem" }}>
                  {selectedTxn.id} — make adjustments and save changes.
                </p>
              </div>
              <button onClick={closeEditor} style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "1.25rem",
                color: C.textMid,
              }}>&times;</button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                    Customer
                  </label>
                  <input
                    type="text"
                    value={editDraft.customer}
                    onChange={(e) => updateField("customer", e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                    Item Type
                  </label>
                  <select
                    value={editDraft.itemType}
                    onChange={(e) => updateField("itemType", e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", backgroundColor: "#fff", color: C.textDark, outline: "none" }}
                  >
                    <option>Full Grain Cowhide</option>
                    <option>Top Grain Leather</option>
                    <option>Italian Goatskin</option>
                    <option>Suede Leather</option>
                    <option>Nappa Leather</option>
                    <option>Patent Leather</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                    Size / Batch
                  </label>
                  <input
                    type="text"
                    value={editDraft.size}
                    onChange={(e) => updateField("size", e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDraft.quantity}
                      onChange={(e) => updateField("quantity", e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDraft.unitPrice}
                      onChange={(e) => updateField("unitPrice", e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", outline: "none" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: "0.78rem", fontWeight: "700", fontFamily: fontSans, color: C.textMid }}>
                    Status
                  </label>
                  <select
                    value={editDraft.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, fontFamily: fontSans, fontSize: "0.92rem", outline: "none" }}
                  >
                    {STATUS_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" onClick={closeEditor} style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: `1px solid ${C.creamBorder}`,
                    background: "#fff",
                    color: C.textMid,
                    cursor: "pointer",
                    fontFamily: fontSans,
                    fontWeight: "700",
                    fontSize: "0.92rem",
                  }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: `linear-gradient(135deg, ${C.maroonMid}, ${C.maroonBtn})`,
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: fontSans,
                      fontWeight: "700",
                      fontSize: "0.92rem",
                      minWidth: 140,
                      boxShadow: "0 6px 18px rgba(139,37,37,0.28)",
                      opacity: 1,
                      visibility: "visible",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}