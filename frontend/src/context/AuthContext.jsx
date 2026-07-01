import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore session from localStorage on load.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sanadi_session");
      if (raw) {
        const saved = JSON.parse(raw);
        setUser(saved.user);
        setToken(saved.token);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  function persist(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(
      "sanadi_session",
      JSON.stringify({ user: nextUser, token: nextToken })
    );
  }

  async function login(email, password) {
    const res = await api.login({ email, password });
    persist(res.user, res.access_token);
    return res.user;
  }

  async function register(payload) {
    const created = await api.register(payload);
    // Auto-login after registration.
    const res = await api.login({ email: payload.email, password: payload.password });
    persist(res.user, res.access_token);
    return created;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("sanadi_session");
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
