import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getStoredAuth, login as authLogin, logout as authLogout } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth());

  const login = useCallback((username) => {
    const ok = authLogin(username);
    if (ok) setUser(getStoredAuth());
    return ok;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      canDelete: user?.role === 'admin',
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
