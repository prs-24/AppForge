import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../lib/firebase';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  avatarUrl?: string;
  locale?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  updateLocale: (locale: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const firebaseToken = await firebaseUser.getIdToken();

          const res = await api.post('/auth/firebase', { firebaseToken });

          localStorage.setItem('appforge_token', res.data.token);
          setToken(res.data.token);
          setUser(res.data.user);
        } catch (err) {
          console.error('Auth sync failed', err);
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('appforge_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function register(email: string, password: string, displayName?: string) {
    const res = await api.post('/auth/register', { email, password, displayName });
    localStorage.setItem('appforge_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
    // ❌ NO backend call here anymore (handled by useEffect)
  }

  async function loginWithGithub() {
    await signInWithPopup(auth, githubProvider);
    // ❌ handled by useEffect
  }

  async function logout() {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem('appforge_token');
    setToken(null);
    setUser(null);
  }

  function updateLocale(locale: string) {
    if (user) setUser({ ...user, locale });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        loginWithGithub,
        logout,
        updateLocale
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}