import { useState, useEffect } from "react";
import { inventoryAPI } from "../../services/api";

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
  success:     "#1A6B2A",
  successBg:   "#E6F4EA",
  pendBg:      "#FEF3D7",
  pendColor:   "#7A5200",
  pendDot:     "#D4A017",
  cancBg:      "#FDECEA",
  cancColor:   "#8B1A1A",
  cancDot:     "#C0392B",
  gold:        "#C9A84C",
};

const font = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

const STATUS_MAP = {
  Pending:   { bg: "#FEF3D7", color: "#7A5200", dot: "#D4A017" },
  Completed: { bg: "#E6F4EA", color: "#1A6B2A", dot: "#2E8B47" },
  Cancelled: { bg: "#FDECEA", color: "#8B1A1A", dot: "#C0392B" },
};

function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: "0.72rem", fontFamily: fontSans, fontWeight: "600",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.62rem", textTransform: "uppercase",
      letterSpacing: "2.5px", color: "rgba(255,255,255,0.35)",
      fontFamily: fontSans, marginBottom: 12,
    }}>{children}</div>
  );
}

const labelStyle = {
  display: "block", marginBottom: 7,
  fontSize: "0.72rem", fontWeight: "700",
  color: C.textMid, fontFamily: fontSans,
  textTransform: "uppercase", letterSpacing: 0.8,
};

// ── FIX: sizeTypes is now an array of { id, value } objects ──
export default function SalesForm({ onSave, itemTypes, sizeTypes }) {
  const [customer, setCustomer]   = useState("");
  const [itemType, setItemType]   = useState("");  // stores leather name (string)
  const [sizeId,   setSizeId]     = useState("");  // stores size id
  const [sizeName, setSizeName]   = useState("");  // stores size display name
  const [quantity, setQuantity]   = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPickup, setIsPickup]   = useState(true);
  const [errors, setErrors]       = useState({});
  const [availableQty, setAvailableQty] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const selectedSize = sizeTypes.find((t) => String(t.id) === sizeId);
  const selectedUnit = selectedSize?.unit === "sqft" ? "sqr" : selectedSize?.unit || "sqr";
  const qty   = parseInt(quantity)    || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = qty * price;
  const selectedItem = itemTypes.find((t) => t.value === itemType) || { value: "—", tag: "" };

  const validate = () => {
    const e = {};
    if (!customer.trim())  e.customer  = "Customer name is required.";
    if (!itemType.trim())  e.itemType  = "Leather item type is required.";
    if (!sizeId)           e.size      = "Size type is required.";
    if (!quantity || qty <= 0 || !Number.isInteger(qty)) e.quantity = "Enter a valid whole number quantity.";
    if (!unitPrice || price <= 0) e.unitPrice = "Enter a valid unit price.";
    if (!deliveryAddress && !isPickup) e.deliveryAddress = "Delivery address is required.";
    if (!scheduledAt && !isPickup)      e.scheduledAt = "Schedule date/time is required.";
    // Inventory checks
    if (availableQty === 0) e.quantity = "Selected item is out of stock.";
    if (availableQty !== null && qty > availableQty) e.quantity = `Only ${availableQty} available.`;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = {
      customer,
      itemType,
      sizeId,
      size: sizeName,
      quantity: qty,
      unitPrice: price,
      item_description: itemDescription,
      is_pickup: isPickup,
      total,
      status: "Pending",
    };
    if (!isPickup) {
      payload.delivery_address = deliveryAddress;
      if (scheduledAt) payload.scheduled_at = scheduledAt;
    }

    onSave(payload);
    setCustomer(""); setItemType("");
    setSizeId(""); setSizeName("");
    setQuantity(""); setUnitPrice("");
    setItemDescription(""); setDeliveryAddress("");
    setScheduledAt(""); setIsPickup(false);
    setErrors({});
  };

  useEffect(() => {
    setAvailableQty(null);
    setInventoryError(null);
    if (!itemType) return;
    let mounted = true;
    inventoryAPI.stock(itemType, selectedUnit)
      .then((res) => {
        if (!mounted) return;
        setAvailableQty(res?.available ?? null);
      })
      .catch((err) => {
        if (!mounted) return;
        setAvailableQty(null);
        setInventoryError(err.message || String(err));
      });
    return () => { mounted = false; };
  }, [itemType, selectedUnit]);

  const fieldStyle = (errKey) => ({
    width: "100%", padding: "11px 14px", borderRadius: 9,
    border: errors[errKey] ? `1.5px solid ${C.error}` : `1px solid ${C.creamBorder}`,
    backgroundColor: errors[errKey] ? C.errorBg : "#fff",
    fontSize: "0.9rem", fontFamily: fontSans, color: C.textDark,
    boxSizing: "border-box", outline: "none",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      minHeight: 520,
    }}
      className="sales-split"
    >
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ════════════════ LEFT — form fields ════════════════ */}
      <div style={{ padding: "30px 28px 30px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: C.maroonMid, fontFamily: font, fontWeight: "bold" }}>
            Record New Sale
          </h2>
          <div style={{ height: 1, background: C.creamBorder }} />
        </div>

        {/* Customer */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Customer Name *</label>
          <input
            type="text"
            value={customer}
            onChange={(e) => { setCustomer(e.target.value); setErrors((p) => ({ ...p, customer: "" })); }}
            placeholder="Client / Company Name"
            style={fieldStyle("customer")}
          />
          {errors.customer && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>{errors.customer}</span>}
        </div>


        {/* Leather type cards */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Leather Item Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {itemTypes.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", padding: 18, borderRadius: 12, background: "#fff", border: `1px solid ${C.creamBorder}`, color: C.textMid, fontFamily: fontSans }}>
                No leather types available. Add one in Settings.
              </div>
            ) : itemTypes.map((type) => {
              const isSelected = itemType === type.value;
              return (
                <div
                  key={type.value}
                  onClick={() => { setItemType(type.value); setErrors((p) => ({ ...p, itemType: "" })); }}
                  style={{
                    border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? C.maroonBtn : C.creamBorder}`,
                    borderRadius: 8,
                    padding: "9px 10px",
                    cursor: "pointer",
                    background: isSelected ? "#FEF6F6" : "#fff",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 5, right: 5,
                      width: 14, height: 14, borderRadius: "50%",
                      background: C.maroonBtn,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                        <polyline points="1,4 4,7 9,1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  {type.photo ? (
                    <img
                      src={type.photo}
                      alt={type.value}
                      style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                    />
                  ) : null}
                  <div style={{
                    fontSize: "0.72rem", fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? C.maroonBtn : C.textMid,
                    fontFamily: fontSans, lineHeight: 1.3,
                  }}>{type.value}</div>
                  <div style={{
                    marginTop: 3, display: "inline-block",
                    fontSize: "0.6rem", padding: "1px 6px", borderRadius: 10,
                    background: isSelected ? C.maroonBtn : C.creamBorder,
                    color: isSelected ? "#fff" : C.textLight,
                    fontFamily: fontSans,
                  }}>{type.tag}</div>
                </div>
              );
            })}
          </div>
          {errors.itemType && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 6, display: "block" }}>{errors.itemType}</span>}
        </div>

        {/* Size type — FIX: now uses sizeTypes as {id, value} objects */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Size type *{" "}
            {sizeName && <span style={{ color: C.maroonBtn, fontWeight: "700", textTransform: "none", letterSpacing: 0 }}>{sizeName}</span>}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sizeTypes.map((opt) => {
              const isSelected = sizeId === String(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSizeId(String(opt.id));
                    setSizeName(opt.value);
                    setErrors((p) => ({ ...p, size: "" }));
                  }}
                  style={{
                    minWidth: 76, height: 40,
                    borderRadius: 6,
                    border: `1.5px solid ${isSelected ? C.maroonDark : C.creamBorder}`,
                    background: isSelected ? C.maroonDark : "#fff",
                    color: isSelected ? "#fff" : C.textDark,
                    fontSize: "0.82rem", fontFamily: fontSans,
                    fontWeight: isSelected ? "700" : "400",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.value}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSizeId("custom");
                setSizeName("Custom");
                setErrors((p) => ({ ...p, size: "" }));
              }}
              style={{
                minWidth: 76, height: 40,
                borderRadius: 6,
                border: `1.5px solid ${sizeId === "custom" ? C.maroonDark : C.creamBorder}`,
                background: sizeId === "custom" ? C.maroonDark : "#fff",
                color: sizeId === "custom" ? "#fff" : C.textDark,
                fontSize: "0.82rem", fontFamily: fontSans,
                fontWeight: sizeId === "custom" ? "700" : "400",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Custom
            </button>
          </div>
          {/* Custom text input */}
          {sizeId === "custom" && (
            <input
              type="text"
              placeholder="Enter size type label"
              onChange={(e) => { setSizeName(e.target.value || "Custom"); setErrors((p) => ({ ...p, size: "" })); }}
              style={{ ...fieldStyle("size"), marginTop: 10 }}
              autoFocus
            />
          )}
          {errors.size && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 6, display: "block" }}>{errors.size}</span>}
        </div>

        {/* Qty stepper + Unit Price */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <div style={{
              display: "flex", alignItems: "center",
              border: errors.quantity ? `1.5px solid ${C.error}` : `1px solid ${C.creamBorder}`,
              borderRadius: 9, overflow: "hidden",
              backgroundColor: errors.quantity ? C.errorBg : "#fff",
              height: 44,
            }}>
              <button
                type="button"
                disabled={availableQty === 0}
                onClick={() => {
                  const v = Math.max(0, (parseInt(quantity) || 0) - 1);
                  setQuantity(String(v));
                  setErrors((p) => ({ ...p, quantity: "" }));
                }}
                style={{
                  width: 44, height: "100%", border: "none",
                  background: "transparent", cursor: availableQty === 0 ? "not-allowed" : "pointer",
                  fontSize: "1.3rem", color: C.textMid, fontFamily: fontSans,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRight: `1px solid ${C.creamBorder}`,
                  flexShrink: 0,
                  opacity: availableQty === 0 ? 0.4 : 1,
                }}
              >−</button>
              <input
                type="number"
                min="0"
                step="1"
                value={quantity}
                placeholder="Qty"
                disabled={availableQty === 0}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setQuantity(v);
                  setErrors((p) => ({ ...p, quantity: "" }));
                }}
                style={{
                  flex: 1, border: "none", outline: "none",
                  textAlign: "center", fontSize: "0.95rem",
                  fontFamily: fontSans, color: C.textDark,
                  background: "transparent", fontWeight: "600",
                  MozAppearance: "textfield",
                  opacity: availableQty === 0 ? 0.5 : 1,
                  cursor: availableQty === 0 ? "not-allowed" : "text",
                }}
              />
              <button
                type="button"
                disabled={availableQty === 0}
                onClick={() => {
                  const v = (parseInt(quantity) || 0) + 1;
                  if (availableQty !== null && v > availableQty) return;
                  setQuantity(String(v));
                  setErrors((p) => ({ ...p, quantity: "" }));
                }}
                style={{
                  width: 44, height: "100%", border: "none",
                  background: "transparent", cursor: availableQty === 0 ? "not-allowed" : "pointer",
                  fontSize: "1.3rem", color: C.textMid, fontFamily: fontSans,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderLeft: `1px solid ${C.creamBorder}`,
                  flexShrink: 0,
                  opacity: availableQty === 0 ? 0.4 : 1,
                }}
              >+</button>
            </div>
            {errors.quantity && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>{errors.quantity}</span>}
            {availableQty === 0 && !errors.quantity && (
              <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>
                {selectedItem.value} is out of stock — this item cannot be recorded right now.
              </span>
            )}
          </div>
          <div>
            <label style={labelStyle}>Unit Price / KG *</label>
            <input
              type="number" step="0.01" min="0"
              value={unitPrice}
              onChange={(e) => { setUnitPrice(e.target.value); setErrors((p) => ({ ...p, unitPrice: "" })); }}
              placeholder="PHP 0.00"
              style={fieldStyle("unitPrice")}
            />
            {errors.unitPrice && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>{errors.unitPrice}</span>}
          </div>
        </div>

        {/* Fulfillment options */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Fulfillment Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              {
                key: "pickup",
                label: "Customer Pick-up",
                hint: "Customer collects the order.",
                activeBg: "#FFF8EC",
                activeBorder: "#D4A017",
                activeColor: "#7A5200",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                    <path d="M1 10h22" />
                    <path d="M12 10v11" />
                    <path d="M7 21h10" />
                  </svg>
                ),
              },
              {
                key: "delivery",
                label: "Delivery",
                hint: "Order will be sent out.",
                activeBg: "#FFF5F5",
                activeBorder: "#B03A3A",
                activeColor: "#8B2525",
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7h18" />
                    <path d="M5 7v10h14V7" />
                    <path d="M8 11h8" />
                    <path d="M8 14h5" />
                  </svg>
                ),
              },
            ].map((option) => {
              const selected = option.key === "pickup" ? isPickup : !isPickup;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    const isPickupOption = option.key === "pickup";
                    setIsPickup(isPickupOption);
                    if (isPickupOption) {
                      setDeliveryAddress("");
                      setScheduledAt("");
                      setErrors((p) => ({ ...p, deliveryAddress: "", scheduledAt: "" }));
                      setShowDeliveryModal(false);
                    } else {
                      setShowDeliveryModal(true);
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    textAlign: "left", borderRadius: 12,
                    padding: "12px 12px", cursor: "pointer",
                    border: `1.5px solid ${selected ? option.activeBorder : C.creamBorder}`,
                    background: selected ? option.activeBg : "#fff",
                    boxShadow: selected ? "0 6px 16px rgba(139,37,37,0.12)" : "0 2px 8px rgba(0,0,0,0.03)",
                    color: selected ? option.activeColor : C.textDark,
                    transition: "all 0.18s ease",
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 10,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: selected ? option.activeBorder : C.creamDim,
                    color: selected ? "#fff" : C.textMid,
                    flexShrink: 0,
                  }}>
                    {option.icon}
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", fontFamily: fontSans, lineHeight: 1.2 }}>{option.label}</span>
                    <span style={{ display: "block", fontSize: "0.68rem", color: selected ? option.activeColor : C.textLight, fontFamily: fontSans, marginTop: 3, lineHeight: 1.35 }}>{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!isPickup && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowDeliveryModal(true)}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${C.creamBorder}`,
                background: "#fff",
                color: C.textDark,
                cursor: "pointer",
                fontFamily: fontSans,
                fontWeight: 700,
                textAlign: "left",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              Enter delivery details
            </button>
            {showDeliveryModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 28px 80px rgba(0,0,0,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: C.maroonMid, fontFamily: fontSans }}>Delivery Details</div>
                      <div style={{ fontSize: "0.78rem", color: C.textLight, fontFamily: fontSans }}>Set the address and schedule for delivery.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryModal(false)}
                      style={{ border: "none", background: "transparent", color: C.textMid, cursor: "pointer", fontSize: "1rem" }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Item Description</label>
                      <textarea
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        rows={3}
                        placeholder="Enter item description"
                        style={{ ...fieldStyle("item_description"), resize: "vertical" }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Delivery Address *</label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          setErrors((p) => ({ ...p, deliveryAddress: "" }));
                        }}
                        rows={3}
                        placeholder="Enter delivery address"
                        style={{ ...fieldStyle("deliveryAddress"), resize: "vertical" }}
                      />
                      {errors.deliveryAddress && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>{errors.deliveryAddress}</span>}
                    </div>
                    <div>
                      <label style={labelStyle}>Schedule *</label>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => {
                          setScheduledAt(e.target.value);
                          setErrors((p) => ({ ...p, scheduledAt: "" }));
                        }}
                        style={fieldStyle("scheduledAt")}
                      />
                      {errors.scheduledAt && <span style={{ color: C.error, fontSize: "0.72rem", fontFamily: fontSans, marginTop: 4, display: "block" }}>{errors.scheduledAt}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryModal(false)}
                      style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${C.creamBorder}`, background: "#fff", color: C.textDark, fontFamily: fontSans, cursor: "pointer" }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryModal(false)}
                      style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: C.maroonBtn, color: "#fff", fontFamily: fontSans, cursor: "pointer" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

</div>

      {/* ════════════════ RIGHT — order summary ════════════════ */}
      <div
        className="order-panel"
        style={{
          background: `linear-gradient(180deg, ${C.maroonDark} 0%, ${C.maroonMid} 100%)`,
          borderLeft: `1px solid ${C.creamBorder}`,
          display: "flex",
          flexDirection: "column",
          padding: "28px 22px",
          borderRadius: "0 18px 18px 0",
        }}
      >
        <SectionLabel>Order Summary</SectionLabel>

        {/* Selected item card */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "14px 16px", marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: fontSans }}>
            Selected Material
          </div>
          {selectedItem.photo ? (
            <img
              src={selectedItem.photo}
              alt={selectedItem.value}
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 12 }}
            />
          ) : null}
          <div style={{ fontSize: "0.88rem", color: "#fff", fontWeight: "600", fontFamily: fontSans }}>
            {selectedItem.value}
          </div>
          <div style={{
            marginTop: 5, display: "inline-block",
            fontSize: "0.6rem", padding: "2px 8px", borderRadius: 10,
            background: C.gold, color: C.maroonDark,
            fontFamily: fontSans, fontWeight: "700",
          }}>{selectedItem.tag}</div>
          <div style={{ marginTop: 8, fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", fontFamily: fontSans }}>
            {availableQty === null ? (
              inventoryError ? <span style={{ color: "#f6c2c2" }}>Inventory unavailable</span> : <span>Checking stock…</span>
            ) : availableQty === 0 ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(176,0,32,0.22)", color: "#FFB3B3",
                fontWeight: "700", fontSize: "0.66rem",
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B", flexShrink: 0 }} />
                Out of Stock
              </span>
            ) : (
              <span>Available stock: <strong>{availableQty}</strong></span>
            )}
          </div>
        </div>

        {/* Customer preview */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontFamily: fontSans }}>
            Customer
          </div>
          <div style={{ fontSize: "0.85rem", color: customer ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: fontSans }}>
            {customer || "—"}
          </div>
        </div>

        {/* Size preview */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontFamily: fontSans }}>
            Size type
          </div>
          <div style={{ fontSize: "0.85rem", color: sizeName ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: fontSans }}>
            {sizeName || "—"}
          </div>
        </div>

        {/* Fulfillment preview */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "10px 16px", marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={isPickup ? "#C9A84C" : "#F2B8B8"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            {isPickup ? (
              <>
                <path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                <path d="M1 10h22" />
                <path d="M12 10v11" />
                <path d="M7 21h10" />
              </>
            ) : (
              <>
                <path d="M3 7h18" />
                <path d="M5 7v10h14V7" />
                <path d="M8 11h8" />
                <path d="M8 14h5" />
              </>
            )}
          </svg>
          <span style={{ fontSize: "0.72rem", color: isPickup ? "#C9A84C" : "#F2B8B8", fontFamily: fontSans, fontWeight: "600" }}>
            {isPickup ? "Customer Pick-up" : "Delivery"}
          </span>
        </div>

        {/* Breakdown */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "14px 16px", marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, fontFamily: fontSans }}>
            Breakdown
          </div>
          {[
            { label: "Quantity", val: qty > 0 ? `${qty.toLocaleString("en-PH")}` : "—" },
            { label: "Unit Price", val: price > 0 ? `₱ ${price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—" },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: fontSans }}>{label}</span>
              <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: "600", fontFamily: fontSans }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: fontSans }}>Subtotal</span>
            <span style={{ fontSize: "0.88rem", color: C.gold, fontWeight: "700", fontFamily: fontSans }}>
              {total > 0 ? `₱ ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
            </span>
          </div>
        </div>

        {/* Status preview */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: fontSans }}>
            Status
          </div>
          <StatusPill status="Pending" />
        </div>

        <div style={{ flex: 1 }} />

        {/* Total */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.12)",
          paddingTop: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: fontSans, marginBottom: 6 }}>
            Total Amount
          </div>
          <div style={{ fontSize: "1.6rem", color: "#fff", fontFamily: font, fontWeight: "700", letterSpacing: "-0.5px" }}>
            PHP {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* CTA */}
        {(() => {
          const isOutOfStock = availableQty === 0;
          const exceedsStock = availableQty !== null && qty > availableQty;
          const disabled = isOutOfStock || exceedsStock;
          return (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              style={{
                width: "100%", padding: "13px 16px",
                borderRadius: 12,
                background: disabled
                  ? "rgba(255,255,255,0.12)"
                  : `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonLight})`,
                color: disabled ? "rgba(255,255,255,0.4)" : "#fff",
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: "700", fontSize: "0.9rem",
                fontFamily: fontSans, letterSpacing: 1,
                boxShadow: disabled ? "none" : "0 8px 24px rgba(0,0,0,0.3)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
            >
              {isOutOfStock ? "Out of Stock" : "Record Sale"}
            </button>
          );
        })()}

        <div style={{
          textAlign: "center", marginTop: 10,
          fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", fontFamily: fontSans,
        }}>
          Transaction logged immediately upon submit
        </div>
      </div>
    </div>
  );
}