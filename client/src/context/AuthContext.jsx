import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiAuth, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const checkSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiAuth.me();
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    const onUnauthorized = () => setUser(null);
    window.addEventListener('blog:unauthorized', onUnauthorized);
    return () => window.removeEventListener('blog:unauthorized', onUnauthorized);
  }, [checkSession]);

  const login = useCallback(async (username, password) => {
    const data = await apiAuth.login(username, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateCredentials = useCallback(async (payload) => {
    const data = await apiAuth.updateCredentials(payload);
    if (data.token) setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      updateCredentials,
    }),
    [user, loading, login, logout, updateCredentials]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return ctx;
}
