import { useState, useEffect } from "react";

const C = {
  maroonDark: "#1C0606",
  maroonMid: "#6B1C1C",
  maroonBtn: "#8B2525",
  gold: "#C9A84C",
};

const font = "'Georgia', 'Times New Roman', serif";
const fontSans = "'Trebuchet MS', 'Segoe UI', sans-serif";

const sidebarItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="4" height="10" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  {
    key: "sales",
    label: "Sales Entry",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "Transaction History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M8 7h8" />
        <path d="M8 12h5" />
        <path d="M13 17h3" />
      </svg>
    ),
  },
];

// Hamburger / X icon
function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

export default function Sidebar({ active, onNav }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleNavClick = (key) => {
    onNav(key);
    if (isMobile) setMobileOpen(false);
  };

  const sidebarVisible = !isMobile || mobileOpen;

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          height: 56,
          background: C.maroonDark,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/src/assets/otto-logo.png"
              alt="Otto Shoes"
              style={{ height: 32, width: 32, borderRadius: 6, objectFit: "cover" }}
              onError={e => { e.target.style.display = "none"; }}
            />
            <div>
              <div style={{ color: "#fff", fontFamily: font, fontSize: "0.9rem", fontWeight: "bold", letterSpacing: 1 }}>OTTO SHOES</div>
              <div style={{ color: C.gold, fontSize: "0.58rem", letterSpacing: 2, fontFamily: fontSans, textTransform: "uppercase" }}>CutWise IMS</div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
              color: "#fff", cursor: "pointer", padding: "6px 8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      )}

      {/* Overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 299,
            background: "rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 248,
        minHeight: "100vh",
        backgroundColor: C.maroonDark,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        boxShadow: "2px 0 16px rgba(0,0,0,0.3)",
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: 0,
        zIndex: 300,
        height: isMobile ? "100vh" : "100vh",
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflowY: "auto",
      }}>
        {/* Logo area */}
        <div style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <img
            src="/src/assets/otto-logo.png"
            alt="Otto Shoes Logo"
            style={{
              width: 42, height: 42, borderRadius: 8,
              objectFit: "cover", flexShrink: 0,
              border: "1px solid rgba(201,168,76,0.3)",
            }}
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          {/* Fallback icon shown if image fails */}
          <div style={{
            display: "none",
            width: 42, height: 42, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.maroonMid}, ${C.gold})`,
            alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: "bold", color: "#fff", flexShrink: 0,
          }}>O</div>
          <div>
            <div style={{
              color: "#fff", fontFamily: font,
              fontSize: "1.05rem", fontWeight: "bold", letterSpacing: 1.5,
              lineHeight: 1.2,
            }}>OTTO SHOES</div>
            <div style={{
              color: C.gold, fontSize: "0.63rem", letterSpacing: 2.5,
              fontFamily: fontSans, textTransform: "uppercase", marginTop: 2,
            }}>CutWise IMS</div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{
          padding: "16px 20px 6px",
          fontSize: "0.6rem", color: "rgba(255,255,255,0.25)",
          fontFamily: fontSans, letterSpacing: 2.5, textTransform: "uppercase",
        }}>Module</div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 12px 16px" }}>
          {sidebarItems.map(item => {
            const isActive = item.key === active;
            return (
              <div
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 14px", borderRadius: 9, marginBottom: 3,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  backgroundColor: isActive ? C.maroonMid : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                  fontFamily: fontSans, fontSize: "0.875rem",
                  fontWeight: isActive ? "600" : "400",
                  borderLeft: isActive ? `3px solid ${C.gold}` : "3px solid transparent",
                  letterSpacing: 0.3,
                }}
              >
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, opacity: isActive ? 1 : 0.65,
                }}>
                  {item.icon}
                </span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: "14px 18px 18px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.maroonMid}, ${C.maroonBtn})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: "bold", flexShrink: 0,
            border: `2px solid ${C.gold}40`,
          }}>JA</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{
              color: "#fff", fontSize: "0.82rem", fontWeight: "600",
              fontFamily: fontSans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>Capili Justine</div>
            <div style={{
              color: "rgba(255,255,255,0.4)", fontSize: "0.7rem",
              fontFamily: fontSans,
            }}>Admin</div>
          </div>
        </div>
      </aside>
    </>
  );
}