"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth, API_URL } from "@/lib/auth";
import { ArrowRight, Swords, X } from "lucide-react";

interface ActiveGame {
  id: string;
  mode: string;
  turnCount: number;
  phase: string;
}

export default function ActiveGameBanner() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);

  const refetch = useCallback(async () => {
    if (!user) { setActiveGame(null); return; }
    try {
      const res = await fetch(`${API_URL}/user/active-game`, { credentials: "include" });
      if (!res.ok) { setActiveGame(null); return; }
      const data = await res.json();
      // Server may return { game: null } when the previous game has ended.
      // Explicitly clear so the banner disappears on re-focus.
      setActiveGame(data?.game ?? null);
    } catch {
      setActiveGame(null);
    }
  }, [user]);

  useEffect(() => {
    refetch();

    const onFocus = () => refetch();
    const onVisibility = () => { if (document.visibilityState === 'visible') refetch(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    // Also poll every 30s in case the user sits on the lobby after a game ended.
    const id = setInterval(refetch, 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(id);
    };
  }, [refetch]);

  const handleDismiss = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeGame) return;
    const id = activeGame.id;
    // Optimistic: hide immediately. Rollback if the API call actually fails.
    setActiveGame(null);
    try {
      const res = await fetch(`${API_URL}/user/active-game/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) refetch();
    } catch {
      refetch();
    }
  }, [activeGame, refetch]);

  if (!activeGame) return null;

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors">
      <Link
        href={`/play?gameId=${activeGame.id}`}
        className="flex items-center gap-3 flex-1 cursor-pointer"
      >
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Swords className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-black tracking-[1px] uppercase text-amber-800">
            Devam Eden Oyun
          </div>
          <div className="text-xs text-amber-600">
            {activeGame.mode.toUpperCase()} — Tur {activeGame.turnCount}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
          Geri Dön <ArrowRight className="w-4 h-4" />
        </div>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        title="Bu oyunu bırak"
        aria-label="Dismiss active game"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-amber-600 hover:bg-amber-200 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
