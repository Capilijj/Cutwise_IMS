import { useState, useEffect } from "react";
import ottoLogo from "../assets/otto-logo.png";

const C = {
  sidebarBg:    "#1C0606",
  sidebarBorder:"#3A1010",
  activeItem:   "#2E0C0C",
  activeBorder: "#C0392B",
  hoverBg:      "#250A0A",

  textWhite:    "#FFFFFF",
  textMuted:    "rgba(255,255,255,0.5)",
  textDim:      "rgba(255,255,255,0.25)",

  gold:         "#C9A84C",
  maroonBtn:    "#8B2525",
};

const fontSans = "'DM Sans', 'Segoe UI', sans-serif";
const fontSerif = "'Playfair Display', 'Georgia', serif";

const NAV_ITEMS = [
  {
    key: "sales",
    label: "Sales Entry",
    sub: "Record new transaction",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    sub: "Manage leather and size types",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.77 1.77 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.77 1.77 0 0 0 15 19.4a1.77 1.77 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.77 1.77 0 0 0 8.6 15a1.77 1.77 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.77 1.77 0 0 0 4.6 9a1.77 1.77 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.77 1.77 0 0 0 9 4.6a1.77 1.77 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.77 1.77 0 0 0 15 8.6a1.77 1.77 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.77 1.77 0 0 0 19.4 9z" />
      </svg>
    ),
  },
];

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // Hardcoded for now — replace with API fetch when auth is ready (sub 2)
  const user = {
    name: "Capili Justine",
    initials: "JA",
    role: "Cashier",
  };

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

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
        .sidebar-nav-item:hover {
          background-color: ${C.hoverBg} !important;
        }
      `}</style>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          height: 56,
          background: C.sidebarBg,
          borderBottom: `1px solid ${C.sidebarBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={ottoLogo}
              alt="Otto Shoes"
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `1.5px solid rgba(255,255,255,0.2)` }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              border: `1.5px solid rgba(255,255,255,0.3)`,
              display: "none", alignItems: "center", justifyContent: "center",
              fontFamily: fontSerif, fontSize: "0.78rem", fontWeight: "600",
              color: C.textWhite, letterSpacing: 1, background: C.maroonBtn,
            }}>OS</div>
            <div>
              <div style={{ fontFamily: fontSerif, fontSize: "0.88rem", color: C.textWhite, letterSpacing: 2, textTransform: "uppercase" }}>OTTO SHOES</div>
              <div style={{ fontSize: "0.55rem", color: C.textMuted, letterSpacing: 3, textTransform: "uppercase" }}>CutWise IMS</div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            style={{
              background: "none", border: "none",
              color: C.textWhite, cursor: "pointer",
              display: "flex", alignItems: "center",
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
          style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260,
        minHeight: "100vh",
        backgroundColor: C.sidebarBg,
        borderRight: `1px solid ${C.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: 0,
        zIndex: 300,
        height: "100vh",
        transform: isMobile
          ? mobileOpen ? "translateX(0)" : "translateX(-100%)"
          : "translateX(0)",
        transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1)",
        overflowY: "auto",
        fontFamily: fontSans,
      }}>

        {/* Brand */}
        <div style={{
          padding: "28px 24px 22px",
          borderBottom: `1px solid ${C.sidebarBorder}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <img
            src={ottoLogo}
            alt="Otto Shoes Logo"
            style={{
              width: 44, height: 44, borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid rgba(255,255,255,0.2)`,
              flexShrink: 0,
            }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: C.maroonBtn,
            border: `2px solid rgba(255,255,255,0.2)`,
            display: "none", alignItems: "center", justifyContent: "center",
            fontFamily: fontSerif, fontSize: "0.9rem", fontWeight: "600",
            color: C.textWhite, letterSpacing: 1, flexShrink: 0,
          }}>OS</div>

          <div>
            <div style={{
              fontFamily: fontSerif, fontSize: "1rem",
              color: C.textWhite, letterSpacing: 2.5,
              textTransform: "uppercase", fontWeight: "600",
              lineHeight: 1.2,
            }}>OTTO SHOES</div>
            <div style={{
              fontSize: "0.58rem", color: C.gold,
              letterSpacing: 3, textTransform: "uppercase", marginTop: 2,
              opacity: 0.85,
            }}>CutWise IMS</div>
          </div>
        </div>

        {/* Module label */}
        <div style={{
          padding: "18px 24px 8px",
          fontSize: "0.6rem", color: C.textDim,
          letterSpacing: 2.5, textTransform: "uppercase",
        }}>Module</div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px 16px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <div
                key={item.key}
                className="sidebar-nav-item"
                onClick={() => handleNavClick(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 8, marginBottom: 2,
                  cursor: "pointer",
                  transition: "background 0.15s",
                  backgroundColor: isActive ? C.activeItem : "transparent",
                  color: isActive ? C.textWhite : C.textMuted,
                  borderLeft: isActive ? `2px solid ${C.activeBorder}` : "2px solid transparent",
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{
                    fontSize: "0.84rem",
                    fontWeight: isActive ? "500" : "400",
                    letterSpacing: 0.2,
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: "0.68rem", color: C.textDim, marginTop: 1,
                  }}>{item.sub}</div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: "14px 20px 22px",
          display: "flex", alignItems: "center", gap: 10,
          borderTop: `1px solid ${C.sidebarBorder}`,
          marginTop: 6,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: C.maroonBtn,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "0.72rem", fontWeight: "500", flexShrink: 0,
            letterSpacing: 0.5,
          }}>
            {user.initials}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: "0.82rem", fontWeight: "500",
              color: C.textWhite, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>{user.name}</div>
            <div style={{ fontSize: "0.68rem", color: C.textMuted }}>{user.role}</div>
          </div>
        </div>
      </aside>
    </>
  );
}