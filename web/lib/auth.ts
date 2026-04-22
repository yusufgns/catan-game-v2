"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export interface AuthUser {
  id: string;
  name: string;
  tag: string;
  email: string | null;
  isGuest: boolean;
  avatarUrl: string | null;
  level: number;
  gems: number;
  eloRating: number;
  rankedGamesPlayed: number;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  loginAsGuest: (name?: string) => Promise<void>;
  loginWithGoogle: () => void;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type AuthContext = AuthState & AuthActions;

const AuthCtx = createContext<AuthContext | null>(null);

export function useAuth(): AuthContext {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { AuthCtx, API_URL };

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/user/me`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data.user, rankedGamesPlayed: data.stats?.rankedGamesPlayed ?? 0 };
  } catch {
    return null;
  }
}

export async function apiLoginAsGuest(name?: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: name || undefined }),
  });
  if (!res.ok) throw new Error("Guest login failed");
  const data = await res.json();
  return { ...data.user, rankedGamesPlayed: data.stats?.rankedGamesPlayed ?? 0 };
}

export function redirectToGoogle() {
  window.location.href = `${API_URL}/auth/google`;
}

export async function apiSendMagicLink(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send magic link");
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Network error — clear local state anyway
  }
}

// ── Provider values factory ───────────────────────────────────────────────────

export function useAuthProvider(): AuthContext {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setState(s => ({ ...s, loading: true, error: null }));
    const user = await fetchMe();
    setState({ user, loading: false, error: null });
  }, []);

  useEffect(() => {
    refresh();

    // Refetch on window focus (tab switch, alt-tab back)
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);

    // Refetch on reconnect
    const onOnline = () => refresh(true);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  const loginAsGuest = useCallback(async (name?: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const user = await apiLoginAsGuest(name);
      setState({ user, loading: false, error: null });
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    redirectToGoogle();
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    setState(s => ({ ...s, error: null }));
    try {
      await apiSendMagicLink(email);
    } catch (e: any) {
      setState(s => ({ ...s, error: e.message }));
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, loginAsGuest, loginWithGoogle, sendMagicLink, logout, refresh };
}
