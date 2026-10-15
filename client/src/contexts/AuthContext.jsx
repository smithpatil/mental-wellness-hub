import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setSession, clearSession, silentRefresh, onSessionExpired } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// The session lives in memory. On a page load the httpOnly refresh cookie is exchanged for a new
// short-lived access token, so nothing sensitive is persisted in localStorage.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    silentRefresh()
      .then((data) => { if (!cancelled) setUser(data.user); })
      .catch(() => { /* not signed in */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    onSessionExpired(() => setUser(null));
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    setSession(data);
    setUser(data.user);
    return data;
  };

  const signup = async (formData) => {
    const { data } = await authAPI.signup(formData);
    setSession(data);
    setUser(data.user);
    return data;
  };

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* cookie may already be gone */ }
    clearSession();
    setUser(null);
  }, []);

  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
