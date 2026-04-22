"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InviteFriendsDialog } from "@/components/InviteFriendsDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Settings, UserPlus, Trophy, ArrowLeftRight,
  Timer, Map, Puzzle, Crown, Check, Clock, Play, X, Shuffle,
  Hexagon, Users, Lock, Globe, Bot, MonitorSmartphone,
} from "lucide-react";
import { useAuth, API_URL } from "@/lib/auth";
import { useWebSocket } from "@/lib/useWebSocket";
import { useLobbyStore } from "@/lib/lobbyStore";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RoomPageWrapper() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RoomPage />
    </Suspense>
  );
}

function RoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Lobby state from Zustand (synced via WebSocket)
  const { players, hostId, code, lobbyId, setLobby, handleServerMessage, gameStarting, lobbyClosed, reset } = useLobbyStore();

  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const initRef = useRef(false); // prevent double lobby creation

  // Settings state
  const [vpIndex, setVpIndex] = useState(1);
  const [tradeIndex, setTradeIndex] = useState(2);
  const [timerIndex, setTimerIndex] = useState(1);
  const [selectedMap, setSelectedMap] = useState("standard");
  const [isPublic, setIsPublic] = useState(false);
  const [randomSeed, setRandomSeed] = useState(true);
  const [expansions, setExpansions] = useState([
    { name: "Seafarers", enabled: false },
    { name: "Cities & Knights", enabled: false },
    { name: "Harbormaster", enabled: false },
  ]);

  const VP_OPTIONS = ["8", "10", "12", "15"];
  const TRADE_OPTIONS = ["2:1", "3:1", "4:1"];
  const TIMER_OPTIONS = ["30s", "60s", "90s", "120s", "Off"];
  const MAP_PRESETS = [
    { id: "standard", name: "Standard", desc: "Classic balanced layout", min: 3, max: 4 },
    { id: "random", name: "Random", desc: "Fully randomized board", min: 3, max: 6 },
    { id: "coastal", name: "Coastal", desc: "More ocean & harbors", min: 3, max: 4 },
    { id: "mini", name: "Mini", desc: "Smaller board, faster games", min: 2, max: 3 },
    { id: "large", name: "Large", desc: "Extended map for big games", min: 5, max: 8 },
  ];
  const activeMap = MAP_PRESETS.find(m => m.id === selectedMap)!;
  const activeExpansions = expansions.filter(e => e.enabled);
  const isHost = user?.id === hostId || (players.length > 0 && players[0]?.id === user?.id);
  const allPlayers = players; // includes bots added locally
  const totalPlayers = allPlayers.length;
  const allReady = totalPlayers >= 2 && allPlayers.every(p => p.isHost || p.ready);

  // ─── Create or join lobby ─────────────────────────────────────────────────

  // Fetch lobby by ID or code, validate it's alive, or redirect home.
  // If the lobby moved on but a game is in progress and the user is a participant,
  // redirect into the game instead of home.
  const fetchAndValidateLobby = useCallback(async (idOrCode: string, isCode: boolean) => {
    try {
      const endpoint = isCode
        ? `${API_URL}/lobby/find?code=${encodeURIComponent(idOrCode)}`
        : `${API_URL}/lobby/${idOrCode}`;
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        if (data?.activeGameId) {
          router.push(`/play?gameId=${data.activeGameId}`);
        }
        return null;
      }
      const lob = data.lobby;
      if (!lob || lob.status === 'closed' || lob.status === 'finished') {
        if (data?.activeGameId) {
          router.push(`/play?gameId=${data.activeGameId}`);
        }
        return null;
      }
      return lob;
    } catch {
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (!user || lobbyId || initRef.current) return;
    initRef.current = true;
    const paramCode = searchParams.get("code");
    const paramId = searchParams.get("id"); // legacy support

    if (paramCode || paramId) {
      const lookupValue = paramCode || paramId!;
      const isCode = !!paramCode;

      // Restore from sessionStorage cache first
      try {
        const cacheKey = `lobby_code_${lookupValue}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { id: cachedId, code: cachedCode, players: cachedPlayers, hostId: cachedHost } = JSON.parse(cached);
          setLobby(cachedId, cachedCode || "");
          if (cachedPlayers?.length) {
            useLobbyStore.setState({ players: cachedPlayers, hostId: cachedHost });
          }
        }
      } catch {}

      // Fetch fresh from API
      fetchAndValidateLobby(lookupValue, isCode).then(lob => {
        if (!lob) {
          try { sessionStorage.removeItem(`lobby_code_${lookupValue}`); } catch {}
          router.push('/');
          return;
        }
        setLobby(lob.id, lob.code);
        // Normalize URL to use code
        window.history.replaceState(null, "", `/room?code=${lob.code}`);
      });
    } else {
      // Create new lobby
      setCreating(true);
      fetch(`${API_URL}/lobby/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "classic" }),
      })
        .then(res => res.json())
        .then(data => {
          setLobby(data.lobbyId, data.code);
          window.history.replaceState(null, "", `/room?code=${data.code}`);
          setCreating(false);
        })
        .catch(() => setCreating(false));
    }
  }, [user, lobbyId, searchParams, setLobby, fetchAndValidateLobby, router]);

  // ─── WebSocket connection ─────────────────────────────────────────────────

  const onMessage = useCallback((msg: any) => {
    if (msg.type === 'SESSION_REPLACED') {
      setSessionReplaced(true);
      return;
    }
    handleServerMessage(msg);
    if (msg.type === 'LOBBY_STATE' && code) {
      setWsReady(true);
      try {
        sessionStorage.setItem(`lobby_code_${code}`, JSON.stringify({
          id: lobbyId, code, players: msg.players, hostId: msg.hostId,
        }));
      } catch {}
    }
  }, [handleServerMessage, lobbyId, code]);

  const { send, state: wsState, reconnect: wsReconnect } = useWebSocket({
    path: lobbyId ? `/ws/lobby/${lobbyId}?playerId=${user?.id}&playerName=${encodeURIComponent(user?.name || "Player")}` : "",
    onMessage,
    enabled: !!lobbyId && !!user,
  });

  // ─── Revalidate lobby on window focus ───────────────────────────────────────

  useEffect(() => {
    const onFocus = async () => {
      if (!lobbyId) return;
      const lob = await fetchAndValidateLobby(lobbyId, false);
      if (!lob) {
        if (code) try { sessionStorage.removeItem(`lobby_code_${code}`); } catch {}
        reset();
        router.push('/');
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [lobbyId, code, fetchAndValidateLobby, reset, router]);

  // ─── Game starting → redirect to play ─────────────────────────────────────

  useEffect(() => {
    if (gameStarting) {
      router.push(`/play?gameId=${gameStarting}`);
    }
  }, [gameStarting, router]);

  // ─── Lobby closed → redirect to home ──────────────────────────────────────

  useEffect(() => {
    if (lobbyClosed) {
      if (code) try { sessionStorage.removeItem(`lobby_code_${code}`); } catch {}
      reset();
      router.push('/');
    }
  }, [lobbyClosed, code, reset, router]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  const sendRef = useRef(send);
  sendRef.current = send;
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    return () => {
      // Send LEAVE message to DO so lobby cleans up immediately
      try { sendRef.current({ type: "LEAVE" }); } catch {}
      // Clean sessionStorage
      if (codeRef.current) {
        try { sessionStorage.removeItem(`lobby_code_${codeRef.current}`); } catch {}
      }
      reset();
    };
  }, [reset]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCopyCode = () => {
    const url = `${window.location.origin}/room?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    send({ type: "READY", ready: newReady });
  };

  const handleStartGame = () => {
    if (isHost && allReady) {
      // Save player list for play page to pick up
      localStorage.setItem("catan_game_players", JSON.stringify(allPlayers));
      send({ type: "START_GAME" });
    }
  };

  const [botMenuSlot, setBotMenuSlot] = useState<number | null>(null);

  const BOT_NAMES = ['KHAN', 'MARCO', 'VIKING', 'CLEOPATRA', 'CAESAR', 'SAMURAI', 'PHARAOH', 'SHOGUN'];
  const BOT_COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];

  const handleAddBot = (difficulty: 'easy' | 'medium' | 'hard') => {
    const usedNames = players.map(p => p.name);
    const botName = BOT_NAMES.find(n => !usedNames.includes(n)) || `Bot_${Date.now()}`;
    send({ type: "ADD_BOT", name: botName, difficulty });
    setBotMenuSlot(null);
  };

  const handleRemoveBot = (botId: string) => {
    send({ type: "REMOVE_BOT", botId });
  };

  const handleMapChange = (mapId: string) => {
    const map = MAP_PRESETS.find(m => m.id === mapId);
    if (!map || allPlayers.length > map.max) return;
    setSelectedMap(mapId);
  };

  const toggleExpansion = (name: string) => {
    setExpansions(prev => prev.map(e => e.name === name ? { ...e, enabled: !e.enabled } : e));
  };

  // Player slots: fill up to max with empty
  const maxSlots = activeMap.max;
  const slots: (typeof players[0] | null)[] = [
    ...players,
    ...Array(Math.max(0, maxSlots - players.length)).fill(null),
  ];

  // Loading / connecting state — show skeleton until we have lobby data
  const isLoading = creating || !lobbyId || (!wsReady && players.length === 0);
  if (isLoading) {
    return (
      <div className="h-screen bg-[#FAFAF8] text-[#1a1a2e] font-sans flex flex-col overflow-hidden">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/5">
          <div className="px-8 md:px-16 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[#717182]"><ArrowLeft className="w-4 h-4" /> Back</Link>
            <div className="h-5 w-px bg-black/10" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-20 h-3 bg-gray-100 rounded animate-pulse mt-1" />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-8 md:px-16 py-6">
          <div className="flex flex-col lg:flex-row gap-8 h-full">
            <div className="lg:flex-[2] bg-white rounded-2xl p-6 border border-black/5">
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="space-y-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:flex-[1] bg-white rounded-2xl p-6 border border-black/5">
              <div className="w-20 h-5 bg-gray-200 rounded animate-pulse mb-5" />
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#E5E7EB]">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                    <div>
                      <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                      <div className="w-16 h-3 bg-gray-50 rounded animate-pulse mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FAFAF8] text-[#1a1a2e] font-sans flex flex-col overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/5">
        <div className="px-8 md:px-16 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[#717182] hover:text-[#1a1a2e] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="h-5 w-px bg-black/10" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                <Puzzle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#1a1a2e] leading-none">CUSTOM LOBBY</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-[#717182]">#{code || "..."}</span>
                  <button onClick={handleCopyCode} className="text-[#99A1AF] hover:text-[#1a1a2e] transition-colors" title="Copy Code">
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsState === "connected" ? "bg-green-500" : wsState === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-[10px] font-semibold text-[#99A1AF] uppercase">{wsState}</span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 px-8 md:px-16 py-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 h-full">
          {/* ─── Left: Match Rules ──────────────────────────────────── */}
          <div className="lg:flex-[2] min-w-0 flex flex-col">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1a1a2e]">Match Rules</h2>
                  <p className="text-xs text-[#717182] mt-0.5">Game configuration for this lobby</p>
                </div>
                <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Custom</span>
              </div>

              <div className="space-y-0 divide-y divide-[#E8E8EC]">
                {[
                  { icon: Trophy, label: "Victory Points", value: VP_OPTIONS[vpIndex] },
                  { icon: ArrowLeftRight, label: "Trade Ratio", value: TRADE_OPTIONS[tradeIndex] },
                  { icon: Timer, label: "Turn Timer", value: TIMER_OPTIONS[timerIndex] },
                  { icon: Users, label: "Players", value: `${activeMap.min}-${activeMap.max}` },
                  { icon: isPublic ? Globe : Lock, label: "Lobby", value: isPublic ? "Public" : "Private" },
                  { icon: Map, label: "Map", value: activeMap.name },
                ].map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.label} className="flex items-center gap-3 py-3.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F7F4] border border-[#E8E8EC] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#717182]" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-[#717182]">{rule.label}</span>
                      <span className="text-sm font-bold text-[#1a1a2e]">{rule.value}</span>
                    </div>
                  );
                })}
                {randomSeed && (
                  <div className="flex items-center gap-3 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F8F7F4] border border-[#E8E8EC] flex items-center justify-center shrink-0">
                      <Shuffle className="w-4 h-4 text-[#717182]" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-[#717182]">Map Seed</span>
                    <span className="text-sm font-bold text-[#1a1a2e]">Random</span>
                  </div>
                )}
              </div>

              <div className="flex-1" />
              <div className="mt-6 flex gap-3">
                {isHost && (
                  <button onClick={() => setShowSettings(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F3F3F5] border-2 border-[#E8E8EC] text-sm font-semibold text-[#1a1a2e] hover:bg-[#E8E8EC] transition-colors cursor-pointer">
                    <Settings className="w-4 h-4" /> Edit Settings
                  </button>
                )}
                <button onClick={() => setShowInvite(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-amber-400 bg-amber-400 text-sm font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer">
                  <UserPlus className="w-4 h-4" /> Invite Friends
                </button>
              </div>
            </div>
          </div>

          {/* ─── Right: Players ─────────────────────────────────────── */}
          <div className="lg:flex-[1] min-w-0 flex flex-col">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#1a1a2e]">Players</h2>
                <span className="text-xs font-semibold text-[#717182] bg-[#F3F3F5] px-2.5 py-1 rounded-full">
                  {allPlayers.length}/{maxSlots}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto min-h-0 flex-1 pr-1">
                {slots.map((player, index) => {
                  if (!player) {
                    return (
                      <div key={`empty-${index}`} className="relative">
                        {/* Empty slot with Add Bot option */}
                        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#E5E7EB]">
                          <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] border border-dashed border-[#D1D5DB] flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-[#C7C7D1]" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[#C7C7D1]">Empty Slot</div>
                            <div className="text-[11px] text-[#D1D5DB]">Waiting for player...</div>
                          </div>
                          {isHost && (
                            <button
                              onClick={() => setBotMenuSlot(botMenuSlot === index ? null : index)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F3F5] hover:bg-[#E8E8EC] text-xs font-semibold text-[#717182] transition-colors cursor-pointer"
                            >
                              <Bot className="w-3.5 h-3.5" /> Add Bot
                            </button>
                          )}
                        </div>

                        {/* Bot difficulty dropdown */}
                        {botMenuSlot === index && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-[#E8E8EC] p-2 w-48">
                            {([
                              { level: 'easy' as const, label: 'Easy', desc: 'Random moves', color: '#22c55e' },
                              { level: 'medium' as const, label: 'Medium', desc: 'Heuristic strategy', color: '#eab308' },
                              { level: 'hard' as const, label: 'Hard', desc: 'MCTS simulation', color: '#ef4444' },
                            ]).map((bot) => (
                              <button
                                key={bot.level}
                                onClick={() => handleAddBot(bot.level)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8F7F4] transition-colors cursor-pointer text-left"
                              >
                                <div className="w-2 h-2 rounded-full" style={{ background: bot.color }} />
                                <div>
                                  <div className="text-sm font-semibold text-[#1a1a2e]">{bot.label}</div>
                                  <div className="text-[10px] text-[#99A1AF]">{bot.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isBot = player.id.startsWith('bot_');

                  return (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-black/5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                        style={{ backgroundColor: player.color || "#6B7280" }}>
                        {isBot ? <Bot className="w-5 h-5" /> : player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#1a1a2e] truncate">{player.name}</span>
                          {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          {isBot && <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">BOT</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {player.ready || player.isHost ? (
                            <><Check className="w-3 h-3 text-green-500" /><span className="text-[11px] font-medium text-green-500">Ready</span></>
                          ) : (
                            <><Clock className="w-3 h-3 text-amber-500" /><span className="text-[11px] font-medium text-amber-500">Waiting</span></>
                          )}
                        </div>
                      </div>
                      {isBot && isHost && (
                        <button onClick={() => handleRemoveBot(player.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ready Up */}
              {!isHost && (
                <button onClick={handleReady}
                  className={`w-full mt-5 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
                    isReady ? "bg-green-500 text-white hover:bg-green-600 border-green-500" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300"
                  }`}>
                  {isReady ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Ready!</span> : "Ready Up"}
                </button>
              )}

              {/* Start Game (host only) */}
              {isHost && (
                <button disabled={!allReady} onClick={handleStartGame}
                  className={`w-full mt-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    allReady
                      ? "border-2 border-amber-400 bg-amber-400 text-white hover:bg-amber-500 cursor-pointer"
                      : "bg-[#F3F3F5] text-[#C7C7D1] border-2 border-[#E8E8EC] cursor-not-allowed"
                  }`}>
                  <Play className="w-4 h-4" /> Start Game
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ─── Settings Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowSettings(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-[640px] max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-white border-b border-[#E8E8EC] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e]">Game Settings</h2>
                  <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">Configure match rules</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F7F4] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[#99A1AF]" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { label: "Victory Points", icon: Trophy, options: VP_OPTIONS, index: vpIndex, setIndex: setVpIndex },
                  { label: "Trade Ratio", icon: ArrowLeftRight, options: TRADE_OPTIONS, index: tradeIndex, setIndex: setTradeIndex },
                  { label: "Turn Timer", icon: Timer, options: TIMER_OPTIONS, index: timerIndex, setIndex: setTimerIndex },
                ].map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.label} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] border border-[#E8E8EC] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#717182]" />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-[#1a1a2e]">{rule.label}</span>
                      <div className="flex gap-1.5">
                        {rule.options.map((opt, i) => (
                          <button key={opt} onClick={() => rule.setIndex(i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              rule.index === i ? "bg-[#1a1a2e] text-white" : "bg-[#F3F3F5] text-[#717182] hover:bg-[#E8E8EC]"
                            }`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => {
                  send({ type: 'UPDATE_SETTINGS', settings: { turnTimer: TIMER_OPTIONS[timerIndex] } });
                  setShowSettings(false);
                }}
                  className="w-full py-4 rounded-lg border-2 border-amber-400 bg-amber-400 text-sm font-bold tracking-[1px] uppercase text-white hover:bg-amber-500 transition-colors cursor-pointer">
                  <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Save Settings</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InviteFriendsDialog
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={() => {}}
        hasEmptySlot={players.length < maxSlots}
        lobbyCode={code || "..."}
      />

      {/* Session replaced dialog */}
      {sessionReplaced && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[200]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 text-center max-w-[380px] shadow-xl border border-white/50">
            <MonitorSmartphone className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <div className="text-[17px] font-extrabold text-[#1a1a2e] mb-1.5">Başka bir sekmede açık</div>
            <p className="text-sm text-black/50 mb-6 leading-relaxed">
              Bu lobi farklı bir sekmede açıldı. Devam etmek için o sekmeye geç veya burada yeniden bağlan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { window.close(); window.location.href = '/'; }}
                className="flex-1 py-2.5 text-[13px] font-extrabold text-black/50 bg-black/5 border border-black/8 rounded-xl cursor-pointer hover:bg-black/10 transition-colors"
              >
                Kapat
              </button>
              <button
                onClick={() => { setSessionReplaced(false); wsReconnect(); }}
                className="flex-1 py-2.5 text-[13px] font-extrabold text-white bg-amber-500 rounded-xl cursor-pointer hover:bg-amber-600 transition-colors shadow-md"
              >
                Buradan devam et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
