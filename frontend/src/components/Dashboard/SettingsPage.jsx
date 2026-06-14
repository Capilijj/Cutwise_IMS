import { useState, useEffect } from "react";

const C = {
  maroonDark: "#1C0606",
  maroonMid: "#6B1C1C",
  maroonBtn: "#8B2525",
  creamBorder: "#EDE8E1",
  creamBg: "#FAF8F5",
  creamCard: "#FFFFFF",
  textDark: "#1C0606",
  textMid: "#4A3030",
  textLight: "#7C6D6D",
  error: "#B00020",
  gold: "#C9A84C",
  danger: "#A62020",
};

const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

export default function SettingsPage({
  leatherTypes,
  sizeTypes,
  canManageSettings = true,
  onAddLeatherType,
  onUpdateLeatherType,
  onDeleteLeatherType,
  onAddSizeType,
  onUpdateSizeType,
  onDeleteSizeType,
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [errors, setErrors] = useState({});
  const [editLeatherIndex, setEditLeatherIndex] = useState(null);
  const [editSizeIndex, setEditSizeIndex] = useState(null);

  useEffect(() => {
    if (editLeatherIndex === null) return;
    const item = leatherTypes[editLeatherIndex];
    if (!item) return;
    setName(item.value);
    setTag(item.tag);
    setPhotoPreview(item.photo || "");
    setErrors((prev) => ({ ...prev, name: "", tag: "" }));
  }, [editLeatherIndex, leatherTypes]);

  useEffect(() => {
    if (editSizeIndex === null) return;
    const item = sizeTypes[editSizeIndex];
    if (!item) return;
    setSizeValue(item.value); // FIX: item is {id, value} object
    setErrors((prev) => ({ ...prev, size: "" }));
  }, [editSizeIndex, sizeTypes]);

  const resetLeatherForm = () => {
    setName("");
    setTag("");
    setPhotoPreview("");
    setErrors((prev) => ({ ...prev, name: "", tag: "" }));
    setEditLeatherIndex(null);
  };

  const resetSizeForm = () => {
    setSizeValue("");
    setErrors((prev) => ({ ...prev, size: "" }));
    setEditSizeIndex(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveLeather = () => {
    const validation = {};
    const trimmedName = name.trim();
    const trimmedTag = tag.trim();

    if (!trimmedName) validation.name = "Leather type name is required.";
    if (!trimmedTag) validation.tag = "Tag or category is required.";
    const normalized = trimmedName.toLowerCase();
    const duplicate = leatherTypes.find(
      (item, idx) => item.value.toLowerCase() === normalized && idx !== editLeatherIndex
    );
    if (duplicate) validation.name = "This leather type already exists.";

    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    const payload = { value: trimmedName, tag: trimmedTag, photo: photoPreview };

    if (editLeatherIndex !== null) {
      onUpdateLeatherType(editLeatherIndex, payload);
    } else {
      onAddLeatherType(payload);
    }

    resetLeatherForm();
  };

  const handleSaveSize = () => {
    const validation = {};
    const trimmedSize = sizeValue.trim();

    if (!trimmedSize) validation.size = "Size type is required.";
    const duplicate = sizeTypes.find((item, idx) => item.value.toLowerCase() === trimmedSize.toLowerCase() && idx !== editSizeIndex);
    if (duplicate) validation.size = "This size type already exists.";

    if (Object.keys(validation).length) {
      setErrors((prev) => ({ ...prev, ...validation }));
      return;
    }

    if (editSizeIndex !== null) {
      onUpdateSizeType(editSizeIndex, trimmedSize);
    } else {
      onAddSizeType(trimmedSize);
    }

    resetSizeForm();
  };

  const leatherButtonLabel = editLeatherIndex !== null ? "Update Leather" : "Add Leather";
  const sizeButtonLabel = editSizeIndex !== null ? "Update Size" : "Add Size";

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${C.creamBorder}`,
    fontFamily: fontSans,
    fontSize: "0.95rem",
    color: C.textDark,
    background: "#fff",
  };

  const panelStyle = {
    borderRadius: 22,
    border: `1px solid ${C.creamBorder}`,
    background: C.creamCard,
    boxShadow: "0 18px 50px rgba(28,6,6,0.06)",
    padding: 26,
  };

  return (
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(280px, 420px) minmax(360px, 1fr)", alignItems: "start" }}>
      <div style={panelStyle}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.maroonDark, fontFamily: fontSans, marginBottom: 6 }}>Leather & Size Settings</div>
          <div style={{ color: C.textMid, lineHeight: 1.7, fontSize: "0.92rem" }}>
            Create, update, and delete leather or size types. {canManageSettings ? "You can manage these settings." : "You can view these settings, but changes are restricted to authorized roles."}
          </div>
        </div>

        <div style={{ display: "grid", gap: 22 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.maroonDark, fontFamily: fontSans }}>Leather Type</div>
                <div style={{ fontSize: "0.82rem", color: C.textLight }}>Name, tag, and image for leather materials.</div>
              </div>
              {editLeatherIndex !== null && (
                <button
                  type="button"
                  onClick={resetLeatherForm}
                  style={{
                    border: `1px solid ${C.creamBorder}`,
                    background: "#F9E7E7",
                    color: C.maroonDark,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    borderRadius: 10,
                    padding: "9px 12px",
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8, fontSize: "0.82rem", color: C.textDark, fontFamily: fontSans }}>
                Name
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  placeholder="Ex: Pebbled Leather"
                  disabled={!canManageSettings}
                  style={{ ...inputStyle, borderColor: errors.name ? C.error : C.creamBorder, background: errors.name ? "#FFF1F0" : "#fff", opacity: canManageSettings ? 1 : 0.75 }}
                />
                {errors.name && <span style={{ color: C.error, fontSize: "0.82rem" }}>{errors.name}</span>}
              </label>

              <label style={{ display: "grid", gap: 8, fontSize: "0.82rem", color: C.textDark, fontFamily: fontSans }}>
                Tag / Category
                <input
                  value={tag}
                  onChange={(e) => { setTag(e.target.value); setErrors((p) => ({ ...p, tag: "" })); }}
                  placeholder="Ex: Premium"
                  disabled={!canManageSettings}
                  style={{ ...inputStyle, borderColor: errors.tag ? C.error : C.creamBorder, background: errors.tag ? "#FFF1F0" : "#fff", opacity: canManageSettings ? 1 : 0.75 }}
                />
                {errors.tag && <span style={{ color: C.error, fontSize: "0.82rem" }}>{errors.tag}</span>}
              </label>

              <label style={{ display: "grid", gap: 8, fontSize: "0.82rem", color: C.textDark, fontFamily: fontSans }}>
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={!canManageSettings}
                  style={{ ...inputStyle, padding: "10px 14px", opacity: canManageSettings ? 1 : 0.75 }}
                />
              </label>

              {photoPreview && (
                <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${C.creamBorder}`, boxShadow: "0 12px 26px rgba(28,6,6,0.08)" }}>
                  <img src={photoPreview} alt="Leather preview" style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 220 }} />
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveLeather}
                disabled={!canManageSettings}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "none",
                  color: "#fff",
                  background: `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonDark})`,
                  fontFamily: fontSans,
                  fontWeight: 700,
                  cursor: canManageSettings ? "pointer" : "not-allowed",
                  opacity: canManageSettings ? 1 : 0.65,
                }}
              >
                {leatherButtonLabel}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.maroonDark, fontFamily: fontSans }}>Size Type</div>
                <div style={{ fontSize: "0.82rem", color: C.textLight }}>Create or update the size tags used in the sales form.</div>
              </div>
              {editSizeIndex !== null && (
                <button
                  type="button"
                  onClick={resetSizeForm}
                  style={{
                    border: `1px solid ${C.creamBorder}`,
                    background: "#F9E7E7",
                    color: C.maroonDark,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    borderRadius: 10,
                    padding: "9px 12px",
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 8, fontSize: "0.82rem", color: C.textDark, fontFamily: fontSans }}>
                Size Label
                <input
                  value={sizeValue}
                  onChange={(e) => { setSizeValue(e.target.value); setErrors((p) => ({ ...p, size: "" })); }}
                  placeholder="Ex: Batch A"
                  disabled={!canManageSettings}
                  style={{ ...inputStyle, borderColor: errors.size ? C.error : C.creamBorder, background: errors.size ? "#FFF1F0" : "#fff", opacity: canManageSettings ? 1 : 0.75 }}
                />
                {errors.size && <span style={{ color: C.error, fontSize: "0.82rem" }}>{errors.size}</span>}
              </label>
              <button
                type="button"
                onClick={handleSaveSize}
                disabled={!canManageSettings}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "none",
                  color: "#fff",
                  background: `linear-gradient(135deg, ${C.maroonBtn}, ${C.maroonDark})`,
                  fontFamily: fontSans,
                  fontWeight: 700,
                  cursor: canManageSettings ? "pointer" : "not-allowed",
                  opacity: canManageSettings ? 1 : 0.65,
                }}
              >
                {sizeButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.maroonDark, fontFamily: fontSans }}>Leather Library</div>
                <div style={{ fontSize: "0.82rem", color: C.textLight }}>Manage your leather materials with edit and delete actions.</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {leatherTypes.length === 0 ? (
                <div style={{ padding: 20, borderRadius: 16, border: `1px dashed ${C.creamBorder}`, color: C.textMid, background: C.creamBg }}>No leather types yet. Add one using the form.</div>
              ) : (
                leatherTypes.map((item, index) => (
                  <div key={item.value} style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 14, alignItems: "center", padding: 16, borderRadius: 18, border: `1px solid ${C.creamBorder}`, background: "#fff" }}>
                    <div style={{ minWidth: 100, minHeight: 84, borderRadius: 16, overflow: "hidden", background: C.creamBg, display: "grid", placeItems: "center" }}>
                      {item.photo ? (
                        <img src={item.photo} alt={item.value} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: C.textLight, fontSize: "0.82rem", textAlign: "center", padding: 8 }}>No image</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.maroonDark, fontFamily: fontSans }}>{item.value}</div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: C.creamBg, color: C.textMid, fontSize: "0.78rem", fontWeight: 700 }}>{item.tag}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => setEditLeatherIndex(index)}
                        disabled={!canManageSettings}
                        style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.creamBorder}`, background: "#fff", color: C.maroonDark, cursor: canManageSettings ? "pointer" : "not-allowed", fontFamily: fontSans, fontSize: "0.82rem", opacity: canManageSettings ? 1 : 0.65 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLeatherType(index)}
                        disabled={!canManageSettings}
                        style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: C.danger, color: "#fff", cursor: canManageSettings ? "pointer" : "not-allowed", fontFamily: fontSans, fontSize: "0.82rem", opacity: canManageSettings ? 1 : 0.65 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.maroonDark, fontFamily: fontSans }}>Size Library</div>
                <div style={{ fontSize: "0.82rem", color: C.textLight }}>Manage size labels used in Sales Entry.</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {sizeTypes.length === 0 ? (
                <div style={{ padding: 20, borderRadius: 16, border: `1px dashed ${C.creamBorder}`, color: C.textMid, background: C.creamBg }}>No size types yet. Add one using the form.</div>
              ) : (
                sizeTypes.map((item, index) => (
                  <div key={`${item.id}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 16, border: `1px solid ${C.creamBorder}`, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ padding: "8px 12px", borderRadius: 999, background: C.creamBg, color: C.textDark, fontSize: "0.88rem", fontWeight: 700 }}>
                        {item.value}{item.unit ? ` • ${item.unit}` : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setEditSizeIndex(index)}
                        disabled={!canManageSettings}
                        style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.creamBorder}`, background: "#fff", color: C.maroonDark, cursor: canManageSettings ? "pointer" : "not-allowed", fontFamily: fontSans, fontSize: "0.82rem", opacity: canManageSettings ? 1 : 0.65 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSizeType(index)}
                        disabled={!canManageSettings}
                        style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: C.danger, color: "#fff", cursor: canManageSettings ? "pointer" : "not-allowed", fontFamily: fontSans, fontSize: "0.82rem", opacity: canManageSettings ? 1 : 0.65 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}