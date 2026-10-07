import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { emailForUsername, userFromSession } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(userFromSession(data.session));
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userFromSession(session));
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const email = emailForUsername(username);
    if (!email || !password) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return false;
    const next = userFromSession(data.session);
    if (!next) {
      await supabase.auth.signOut();
      return false;
    }
    setUser(next);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isSocial: user?.role === 'social',
      canDelete: user?.role === 'admin',
      canTrackGames: user?.role === 'admin' || user?.role === 'worker',
      canFillPlayers: user?.role === 'admin' || user?.role === 'worker',
      login,
      logout,
    }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
