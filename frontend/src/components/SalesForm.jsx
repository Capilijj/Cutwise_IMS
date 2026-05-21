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

const ITEM_TYPES = [
  "Full Grain Cowhide",
  "Top Grain Leather",
  "Italian Goatskin",
  "Suede Leather",
  "Nappa Leather",
  "Patent Leather",
];

export default function SalesForm({ onSave }) {
  const [customer, setCustomer] = useState("");
  const [itemType, setItemType] = useState(ITEM_TYPES[0]);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [status, setStatus] = useState("Pending");
  const [errors, setErrors] = useState({});

  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  const validate = () => {
    const e = {};
    if (!customer.trim()) e.customer = "Customer name is required.";
    if (!size.trim()) e.size = "Size / Batch is required.";
    if (!quantity || parseFloat(quantity) <= 0) e.quantity = "Enter a valid quantity.";
    if (!unitPrice || parseFloat(unitPrice) <= 0) e.unitPrice = "Enter a valid unit price.";
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    onSave({
      customer,
      itemType,
      size,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice),
      total,
      status,
    });

    setCustomer("");
    setItemType(ITEM_TYPES[0]);
    setSize("");
    setQuantity("");
    setUnitPrice("");
    setStatus("Completed");
    setErrors({});
  };

  const fieldStyle = (errKey) => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 9,
    border: errors[errKey] ? `1.5px solid ${C.error}` : `1px solid ${C.creamBorder}`,
    backgroundColor: errors[errKey] ? C.errorBg : "#fff",
    fontSize: "0.92rem",
    fontFamily: fontSans,
    color: C.textDark,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 7,
    fontSize: "0.78rem",
    fontWeight: "700",
    color: C.textMid,
    fontFamily: fontSans,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <section style={{
      backgroundColor: C.creamCard,
      borderRadius: 18,
      padding: "32px 28px",
      boxShadow: "0 18px 45px rgba(28, 6, 6, 0.08)",
      border: `1px solid ${C.creamBorder}`,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: C.maroonMid, fontFamily: font, fontWeight: "bold" }}>
            Record New Sale
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: C.textLight, fontFamily: fontSans, maxWidth: 500 }}>
            US-001 - Sprint 1
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Customer Name *</label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Client / Company Name"
            style={fieldStyle("customer")}
          />
          {errors.customer && <span style={{ color: C.error, fontSize: "0.75rem", fontFamily: fontSans }}>{errors.customer}</span>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Leather Item Type</label>
          <select value={itemType} onChange={(e) => setItemType(e.target.value)} style={fieldStyle()}>
            {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Size / Batch Allocation *</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. Batch-2026-05"
            style={fieldStyle("size")}
          />
          {errors.size && <span style={{ color: C.error, fontSize: "0.75rem", fontFamily: fontSans }}>{errors.size}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Quantity (KG) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              style={fieldStyle("quantity")}
            />
            {errors.quantity && <span style={{ color: C.error, fontSize: "0.75rem", fontFamily: fontSans }}>{errors.quantity}</span>}
          </div>
          <div>
            <label style={labelStyle}>Unit Price / KG *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="PHP 0.00"
              style={fieldStyle("unitPrice")}
            />
            {errors.unitPrice && <span style={{ color: C.error, fontSize: "0.75rem", fontFamily: fontSans }}>{errors.unitPrice}</span>}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle()}>            
            <option>Pending</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.maroonDark}, ${C.maroonMid})`,
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.8rem", fontFamily: fontSans, textTransform: "uppercase", letterSpacing: 1 }}>
            Computed Total
          </span>
          <span style={{ color: "#fff", fontSize: "1.35rem", fontFamily: font, fontWeight: "700" }}>
            PHP {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <button type="submit" style={{
          width: "100%",
          padding: "13px 16px",
          borderRadius: 12,
          background: `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonLight})`,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "0.95rem",
          fontFamily: fontSans,
          letterSpacing: 0.8,
          boxShadow: "0 14px 32px rgba(139,37,37,0.18)",
        }}>
          Record Sale
        </button>
      </form>
    </section>
  );
}
