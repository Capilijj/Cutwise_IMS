import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DeliveryDashboard from "./pages/DeliveryDashboard.jsx";
import DeliveryPage from "./pages/DeliveryPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ScrapPage from "./pages/ScrapPage.jsx";
import SupplierPage from "./pages/SupplierPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import CourierPage from "./pages/CourierPage.jsx";
import CancelledDeliveryPage from "./pages/CancelledDeliveryPage.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import ProofPage from "./pages/ProofPage.jsx";
import { C, font } from "./lib/styles.js";

const USER_KEY = "otto_user";

const loadUser = () => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

const saveUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export default function App() {
  const [user, setUser] = useState(loadUser());
  const [selectedPage, setSelectedPage] = useState("Delivery");

  useEffect(() => {
    saveUser(user);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    setSelectedPage("Delivery");
  };

  const handleLogout = () => {
    setUser(null);
  };

  const renderPage = () => {
    if (!user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (selectedPage) {
      case "Dashboard":
        return <DeliveryDashboard user={user} />;
      case "Delivery":
        return <DeliveryPage user={user} />;
      case "Proof":
        return <ProofPage user={user} />;
      case "Cancelled":
        return <CancelledDeliveryPage />;
      case "Courier":
        return <CourierPage user={user} />;
      case "Inventory":
        return <InventoryPage />;
      case "Scrap":
        return <ScrapPage />;
      case "Suppliers":
        return <SupplierPage />;
      case "Reports":
        return <ReportsPage />;
      case "Settings":
        return <SettingsPage user={user} onProfileUpdated={setUser} />;
      default:
        return <ComingSoon />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.cream, fontFamily: font }}>
      {user && (
        <Sidebar
          user={user}
          selectedPage={selectedPage}
          onSelectPage={setSelectedPage}
          onLogout={handleLogout}
        />
      )}
      <div style={{ flex: 1, height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {user && (() => {
          const savedAvatar = localStorage.getItem(`otto_avatar_${user.id}`);
          const avatarSrc = savedAvatar || user?.avatar_url;
          const displayName = user?.full_name || user?.username || 'User';
          let displayRole = 'Staff';
          if (user?.role) {
            const roleNorm = user.role.toLowerCase();
            if (roleNorm === 'courier' || roleNorm === 'delivery') {
              displayRole = 'Courrier';
            } else {
              displayRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            }
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, padding: '22px 28px 18px', borderBottom: `1px solid ${C.border}`, background: C.cream, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: font }}>{displayName}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>{displayRole}</div>
              </div>
              {avatarSrc ? (
                <img 
                  src={avatarSrc} 
                  alt="Avatar" 
                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }} 
                />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F4F1EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: C.maroonDeep, fontFamily: font }}>
                  {user?.full_name ? user.full_name[0] : (user?.username ? user.username[0] : 'U')}
                </div>
              )}
            </div>
          );
        })()}
        {renderPage()}
      </div>
    </div>
  );
}
