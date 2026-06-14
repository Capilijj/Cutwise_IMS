import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const AuthContext = createContext(null);

function getCsrfToken() {
  return document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="))
    ?.split("=")[1] || "";
}

async function request(path, options = {}) {
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  let data = null;
  if (text) {
    try {
      data = contentType.includes("application/json") ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const detail = data?.detail || data?.message || (text ? text.slice(0, 160) : "Request failed.");
    throw new Error(detail);
  }

  return data ?? (text ? { raw: text } : null);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ims_user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const me = await request("/auth/me/");
        if (!ignore) {
          setUser(me);
          localStorage.setItem("ims_user", JSON.stringify(me));
        }
      } catch {
        if (!ignore) {
          setUser(null);
          localStorage.removeItem("ims_user");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const signIn = async (username, password, role = "") => {
    const data = await request("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
    const nextUser = data || null;
    setUser(nextUser);
    if (nextUser) localStorage.setItem("ims_user", JSON.stringify(nextUser));
    else localStorage.removeItem("ims_user");
    return nextUser;
  };

  const signOut = async () => {
    try {
      await request("/auth/logout/", { method: "POST" });
    } finally {
      setUser(null);
      localStorage.removeItem("ims_user");
      sessionStorage.clear();
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
  };

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
