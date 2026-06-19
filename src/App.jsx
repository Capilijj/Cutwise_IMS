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
import ReDeliveryPage from "./pages/ReDeliveryPage.jsx";
import CourierProfilePage from "./pages/CourierProfilePage.jsx";
import CourierDeliveriesPage from "./pages/CourierDeliveriesPage.jsx";
import CourierDashboard from "./pages/CourierDashboard.jsx";
import CourierOnboardingPage from "./pages/CourierOnboardingPage.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import ProofPage from "./pages/ProofPage.jsx";
import { C, font } from "./lib/styles.js";
import { Modal, Btn } from "./components/ui.jsx";

const USER_KEY = "otto_user";

const loadUser = () => {
  try {
    // Proactive cleanup of large cached base64 avatars to free up localStorage space
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('otto_avatar_')) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.length > 50000) {
            localStorage.removeItem(key);
          }
        } catch (e) {}
      }
    }
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.avatar_url && parsed.avatar_url.length > 50000) {
        parsed.avatar_url = null;
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(parsed));
        } catch (e) {}
      }
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Failed to load user from localStorage:", error);
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
    return null;
  }
};

const saveUser = (user) => {
  try {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save user to localStorage:", error);
    try {
      // Clear cached avatars to free up space
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('otto_avatar_')) {
          localStorage.removeItem(key);
        }
      }
      // Retry once without avatar_url if it was too large
      if (user && user.avatar_url) {
        const fallbackUser = { ...user, avatar_url: null };
        localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
      }
    } catch (innerError) {
      console.error("Critical: local storage recovery failed:", innerError);
    }
  }
};

export default function App() {
  const [user, setUser] = useState(loadUser());
  const [onboardingUser, setOnboardingUser] = useState(null); // new user pending onboarding
  const [selectedPage, setSelectedPage] = useState(() => {
    const usr = loadUser();
    if (usr) {
      const role = usr.role?.toLowerCase() || usr.profile?.role?.toLowerCase();
      if (role === 'courier' || role === 'delivery') return "CourierDashboard";
    }
    return "Delivery";
  });
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  useEffect(() => {
    saveUser(user);
  }, [user]);

  const handleLogin = (userData) => {
    const role = userData?.role?.toLowerCase() || userData?.profile?.role?.toLowerCase();
    const hasVehicle = userData?.vehicleType || userData?.vehicle_type || userData?.profile?.vehicleType || userData?.profile?.vehicle_type;
    // New courier accounts without a vehicle type → go to onboarding
    if ((role === 'courier' || role === 'delivery') && !hasVehicle) {
      setOnboardingUser(userData);
      return;
    }
    setUser(userData);
    if (role === 'courier' || role === 'delivery') {
      setSelectedPage("CourierDashboard");
    } else {
      setSelectedPage("Delivery");
    }
  };

  const handleOnboardingComplete = (updatedUser) => {
    if (updatedUser) {
      setUser(updatedUser);
    } else if (onboardingUser) {
      setUser(onboardingUser);
    }
    setOnboardingUser(null);
    setSelectedPage("CourierDashboard");
  };

  const handleLogout = () => {
    const isCourierUser = user?.role?.toLowerCase() === 'courier' || user?.role?.toLowerCase() === 'delivery';
    const clockStatus = user?.clock_status || user?.profile?.clock_status || 'Clocked Out';
    if (isCourierUser && clockStatus !== 'Clocked Out') {
      setShowLogoutWarning(true);
    } else {
      setUser(null);
    }
  };

  const renderPage = () => {
    // Show onboarding for newly signed-up couriers
    if (onboardingUser) {
      return <CourierOnboardingPage user={onboardingUser} onComplete={handleOnboardingComplete} />;
    }

    if (!user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (selectedPage) {
      case "Dashboard":
        return <DeliveryDashboard user={user} />;
      case "Delivery":
        return <DeliveryPage user={user} onUserUpdate={setUser} />;
      case "Proof":
        return <ProofPage user={user} />;
      case "ReDelivery":
        return <ReDeliveryPage user={user} onRedirect={setSelectedPage} />;
      case "CourierProfile":
        return <CourierProfilePage user={user} onUserUpdate={setUser} />;
      case "CourierDashboard":
        return <CourierDashboard user={user} onUserUpdate={setUser} onRedirect={setSelectedPage} />;
      case "CourierDeliveries":
        return <CourierDeliveriesPage user={user} />;
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

          const isCourierUser = user?.role?.toLowerCase() === 'courier' || user?.role?.toLowerCase() === 'delivery';
          let statusColor = '#95A5A6'; // Default Gray (Clocked Out)
          const clockStatus = user?.clock_status || user?.profile?.clock_status || 'Clocked Out';
          const isLocked = user?.is_locked || user?.profile?.is_locked;

          if (isLocked) {
            statusColor = '#E74C3C'; // Red
          } else if (clockStatus === 'Clocked In') {
            statusColor = '#2ECC71'; // Green
          } else if (clockStatus === 'Out for Delivery') {
            statusColor = '#3498DB'; // Blue
          } else if (clockStatus === 'On Break') {
            statusColor = '#F1C40F'; // Yellow
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, padding: '22px 28px 18px', borderBottom: `1px solid ${C.border}`, background: C.cream, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {isCourierUser && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: statusColor,
                      boxShadow: '0 0 2px rgba(0,0,0,0.2)'
                    }} />
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: font }}>{displayName}</div>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>{displayRole}</div>
              </div>
              <div style={{ position: 'relative' }}>
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
                {isCourierUser && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: statusColor,
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }} />
                )}
              </div>
            </div>
          );
        })()}
        {renderPage()}
      </div>
      {showLogoutWarning && (
        <Modal 
          title="Clock Out Reminder" 
          onClose={() => setShowLogoutWarning(false)} 
          width={400}
        >
          <div style={{ display: 'grid', gap: 14, fontFamily: font }}>
            <p style={{ margin: 0, fontSize: 14, color: C.textPrimary, lineHeight: 1.5 }}>
              You haven't clocked out yet. Do you want to clock out first before logging out?
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Btn 
                outline 
                style={{ flex: 1 }} 
                onClick={() => {
                  setShowLogoutWarning(false);
                  setUser(null);
                }}
              >
                Logout Anyway
              </Btn>
              <Btn 
                primary 
                style={{ flex: 1 }} 
                onClick={() => {
                  setShowLogoutWarning(false);
                  setSelectedPage("CourierDashboard");
                }}
              >
                Go to Dashboard
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
