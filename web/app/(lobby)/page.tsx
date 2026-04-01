"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Trophy, Settings2, ChevronRight, ChevronLeft,
  Check, X, Hexagon, Circle, Users, Search,
  UserPlus, UserMinus, MessageCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameInvite {
  id: string; from: string; mode: string; avatar: string; color: string;
}

interface FriendRequest {
  id: string; name: string; avatar: string; color: string;
}

interface Friend {
  id: string; name: string; status: "online" | "in-game" | "offline";
  avatar: string; color: string; lastSeen?: string; unread?: number;
}

type MatchmakingPhase = "idle" | "searching" | "found";

// ─── Data ────────────────────────────────────────────────────────────────────

const GAME_INVITES: GameInvite[] = [
  { id: "1", from: "IronWarrior", mode: "CLASSIC MODE", avatar: "⚔️", color: "#A04028" },
  { id: "2", from: "MysticMage", mode: "RANKED MATCH", avatar: "🔮", color: "#7B2D8E" },
];

const FRIEND_REQUESTS: FriendRequest[] = [
  { id: "1", name: "DragonSlayer", avatar: "🐉", color: "#2D5A27" },
];

const INITIAL_FRIENDS: Friend[] = [
  { id: "1", name: "IronWarrior", status: "in-game", avatar: "⚔️", color: "#A04028", unread: 2 },
  { id: "2", name: "MysticMage", status: "online", avatar: "🔮", color: "#7B2D8E" },
  { id: "3", name: "CrystalKnight", status: "online", avatar: "💎", color: "#2A4A7F", unread: 1 },
  { id: "4", name: "ShadowBlade", status: "offline", avatar: "🗡️", color: "#555", lastSeen: "2H AGO" },
  { id: "5", name: "StormBreaker", status: "offline", avatar: "⛈️", color: "#555", lastSeen: "5H AGO" },
  { id: "6", name: "PhoenixRise", status: "offline", avatar: "🔥", color: "#555", lastSeen: "1D AGO" },
  { id: "7", name: "DarkRaven", status: "offline", avatar: "🦅", color: "#555", lastSeen: "2D AGO" },
  { id: "8", name: "SilverFox", status: "offline", avatar: "🦊", color: "#555", lastSeen: "3D AGO" },
];

const GAME_MODES = [
  { id: "classic", label: "CLASSIC", sub: "ADVENTURE", icon: Swords, color: "#2D5A27", bg: "/cards/classic.jpg", queue: "Classic • Quick Match" },
  { id: "ranked", label: "RANKED", sub: "ARENA S3", icon: Trophy, color: "#E3B448", bg: "/cards/ranked.jpg", queue: "RANKED Arena • Global Queue" },
  { id: "custom", label: "CUSTOM", sub: "PRACTICE", icon: Settings2, color: "#A04028", bg: "/cards/custom.jpg", queue: "" },
];

// ─── Matchmaking Overlay ─────────────────────────────────────────────────────

function MatchmakingOverlay({
  mode,
  phase,
  onCancel,
  onAccept,
  onDecline,
}: {
  mode: typeof GAME_MODES[0];
  phase: MatchmakingPhase;
  onCancel: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [players, setPlayers] = useState(1);
  const [countdown, setCountdown] = useState(10);
  const [confirmations, setConfirmations] = useState(1);

  useEffect(() => {
    if (phase !== "searching") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "searching") return;
    const delays = [2000, 5000, 8000];
    const timers = delays.map((d, i) =>
      setTimeout(() => setPlayers(Math.min(i + 2, 4)), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "found") return;
    setCountdown(10);
    setConfirmations(1);
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    const c1 = setTimeout(() => setConfirmations(2), 1500);
    const c2 = setTimeout(() => setConfirmations(3), 3000);
    return () => { clearInterval(t); clearTimeout(c1); clearTimeout(c2); };
  }, [phase]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="w-[420px] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {phase === "searching" && (
          <div className="flex flex-col items-center px-10 py-10">
            <h2 className="text-[28px] font-black tracking-[4px] uppercase text-[#1a1a2e] mb-2">
              Finding Match
            </h2>
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#99A1AF] mb-12">
              {mode.queue}
            </p>

            <div className="relative w-48 h-48 mb-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-[2px] border-dashed"
                style={{ borderColor: `${mode.color}30` }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border-[1.5px] border-[#E8E8EC]"
                style={{ borderTopColor: mode.color }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Search className="w-10 h-10 text-[#C4C4CC] mb-3" />
                <span className="text-[30px] font-black text-[#1a1a2e] tracking-tight">{players}/4</span>
                <span className="text-[11px] font-black tracking-[2px] uppercase text-[#99A1AF]">Players</span>
              </div>
            </div>

            <div className="flex gap-3 w-full mb-5">
              <div className="flex-1 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg p-5">
                <span className="text-[10px] font-black tracking-[1px] uppercase text-[#99A1AF] block mb-2">Elapsed</span>
                <span className="text-xl font-mono font-bold text-[#1a1a2e]">{mins}:{secs}</span>
              </div>
              <div className="flex-1 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg p-5">
                <span className="text-[10px] font-black tracking-[1px] uppercase text-[#99A1AF] block mb-2">Mode</span>
                <span className="text-xl font-black uppercase" style={{ color: mode.color }}>{mode.label}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="w-full py-4 rounded-lg text-sm font-bold tracking-[1.2px] uppercase text-red-500 bg-red-50 border border-red-200 cursor-pointer"
              style={{ boxShadow: "0 3px 0 #fecaca" }}
            >
              Cancel Search
            </motion.button>
          </div>
        )}

        {phase === "found" && (
          <div className="flex flex-col items-center px-10 py-10">
            <div className="px-5 py-1.5 bg-orange-500 rounded-sm mb-4">
              <span className="text-[10px] font-black tracking-[3px] uppercase text-white">Match Found</span>
            </div>

            <h2 className="text-[28px] font-black tracking-[3px] uppercase text-[#1a1a2e] text-center leading-tight mb-2">
              PREPARE<br />FOR BATTLE
            </h2>
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-orange-500 mb-10">
              Confirm your participation
            </p>

            <div className="relative w-40 h-40 mb-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-[3px] border-dashed border-orange-200"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[60px] font-black text-[#1a1a2e] leading-none">{countdown}</span>
                <span className="text-[10px] font-black tracking-[1px] uppercase text-[#99A1AF] mt-1">Seconds Left</span>
              </div>
            </div>

            <div className="w-full mb-6">
              <div className="flex items-center justify-between px-2 mb-3">
                <span className="text-xs font-black tracking-[1.2px] text-[#99A1AF]">CONFIRMATIONS</span>
                <span className="text-xs font-black tracking-[1.2px] text-orange-500">{confirmations}/4 READY</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{
                      background: i <= confirmations ? "#f97316" : "#E8E8EC",
                      boxShadow: i <= confirmations ? "0 0 8px rgba(249,115,22,0.4)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="w-full space-y-3">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAccept}
                className="w-full py-5 rounded-lg text-lg font-bold tracking-[1.2px] uppercase text-white bg-orange-500 cursor-pointer"
                style={{ boxShadow: "0 4px 0 #c2410c" }}
              >
                Accept Match
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onDecline}
                className="w-full py-3 rounded-lg text-xs font-bold tracking-[1.2px] uppercase text-[#99A1AF] hover:text-[#717182] transition-colors cursor-pointer bg-[#F8F7F4] border border-[#E8E8EC]"
              >
                Decline
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LobbyPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [matchPhase, setMatchPhase] = useState<MatchmakingPhase>("idle");
  const [matchMode, setMatchMode] = useState<typeof GAME_MODES[0] | null>(null);
  const [friendSearch, setFriendSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [addFriendInput, setAddFriendInput] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [removeFriendId, setRemoveFriendId] = useState<string | null>(null);
  const [chatFriendId, setChatFriendId] = useState<string | null>(null);

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
    f.id.toLowerCase().includes(friendSearch.toLowerCase())
  );
  const onlineFriends = filteredFriends.filter(f => f.status === "online" || f.status === "in-game").length;
  const offlineFriends = filteredFriends.filter(f => f.status === "offline").length;

  const handleAddFriend = () => {
    const name = addFriendInput.trim();
    if (!name || friends.some(f => f.name.toLowerCase() === name.toLowerCase())) return;
    const avatars = ["🎮", "🎯", "🎲", "🃏", "🏰", "⚡", "🌟", "🎪"];
    const colors = ["#E3B448", "#A04028", "#2D5A27", "#7B2D8E", "#2A4A7F", "#06B6D4"];
    setFriends(prev => [...prev, {
      id: `f-${Date.now()}`,
      name,
      status: "online",
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    }]);
    setAddFriendInput("");
    setShowAddFriend(false);
  };

  const handleRemoveFriend = (id: string) => {
    setFriends(prev => prev.filter(f => f.id !== id));
    setRemoveFriendId(null);
  };

  const removeFriend = friends.find(f => f.id === removeFriendId);
  const chatFriend = friends.find(f => f.id === chatFriendId);

  const startMatchmaking = useCallback((mode: typeof GAME_MODES[0]) => {
    setMatchMode(mode);
    setMatchPhase("searching");
    // Simulate match found after 6-10s
    setTimeout(() => setMatchPhase("found"), 6000 + Math.random() * 4000);
  }, []);

  const handleCardClick = useCallback((modeId: string) => {
    setSelectedMode(modeId);
    if (modeId === "custom") {
      router.push("/room");
    } else {
      const mode = GAME_MODES.find(m => m.id === modeId)!;
      startMatchmaking(mode);
    }
  }, [router, startMatchmaking]);

  return (
    <>
      {/* ─── CENTER CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-8">

          {/* Hero title */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-px bg-[#D4D4D8]" />
              <Hexagon className="w-5 h-5 text-amber-500" />
              <div className="w-12 h-px bg-[#D4D4D8]" />
            </div>
            <h1 className="text-4xl font-black tracking-[8px] uppercase text-[#1a1a2e] mb-2">
              TACTILE DIGITAL
            </h1>
            <p className="text-xs tracking-[4px] uppercase text-[#99A1AF]">
              CHOOSE YOUR DESTINY
            </p>
          </div>

          {/* Game mode cards */}
          <div className="flex items-end gap-6">
            {GAME_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              const isRanked = mode.id === "ranked";
              const cardW = isRanked ? "w-[260px]" : "w-[220px]";
              const cardH = isRanked ? "h-[400px]" : "h-[340px]";
              return (
                <button
                  key={mode.id}
                  onClick={() => handleCardClick(mode.id)}
                  className={`relative ${cardW} ${cardH} flex flex-col items-center overflow-hidden transition-all duration-200 rounded-xl bg-white border border-[#E8E8EC] shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer focus:outline-none`}
                >
                  <div className="absolute inset-0 bg-[#F3F4F6] rounded-xl overflow-hidden">
                    <img
                      src={mode.bg}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-[45%]"
                      style={{
                        background: "linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                      }}
                    />
                  </div>

                  <div className="relative z-10 flex-1 flex flex-col items-center justify-end pb-6">
                    <div className="mb-5">
                      <div className="rotate-45">
                        <div className="w-16 h-16 bg-[rgba(13,15,24,0.15)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <div className="-rotate-45">
                            <Icon className={`${isRanked ? "w-7 h-7" : "w-5 h-5"}`} style={{ color: mode.color }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black tracking-[3.6px] uppercase text-[#1a1a2e] mb-4">
                      {mode.label}
                    </h3>

                    <div className="px-5 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-sm shadow-sm">
                      <span
                        className="text-[9px] font-black tracking-[2px] uppercase leading-none"
                        style={{ color: mode.color }}
                      >
                        {mode.sub}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ─── RIGHT PANEL ───────────────────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 bg-white border-l border-[#E8E8EC] overflow-y-auto">
        <div className="p-4 border-b border-[#E8E8EC]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF]">GAME INVITES</span>
            <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-sm">{GAME_INVITES.length}</span>
          </div>
          <div className="space-y-2">
            {GAME_INVITES.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 p-2.5 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm" style={{ background: `${invite.color}15`, border: `1px solid ${invite.color}30` }}>
                  {invite.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-amber-600">GAME INVITE</div>
                  <div className="text-xs font-black text-[#1a1a2e] truncate">{invite.from}</div>
                  <div className="text-[8px] font-bold tracking-wider uppercase text-[#99A1AF]">{invite.mode}</div>
                </div>
                <div className="flex gap-1">
                  <button className="w-7 h-7 flex items-center justify-center bg-green-50 text-green-600 rounded hover:bg-green-100 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                  <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 rounded hover:bg-red-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-[#E8E8EC]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF]">FRIEND REQUESTS</span>
            <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-sm">{FRIEND_REQUESTS.length}</span>
          </div>
          <div className="space-y-2">
            {FRIEND_REQUESTS.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-2.5 bg-green-50/50 border border-green-200/50 rounded-lg">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm" style={{ background: `${req.color}15`, border: `1px solid ${req.color}30` }}>
                  {req.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-green-600">FRIEND REQUEST</div>
                  <div className="text-xs font-black text-[#1a1a2e] truncate">{req.name}</div>
                  <div className="text-[8px] font-bold tracking-wider uppercase text-[#99A1AF]">WANTS TO CONNECT</div>
                </div>
                <div className="flex gap-1">
                  <button className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                  <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 rounded hover:bg-red-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex mt-3 border border-[#E8E8EC] rounded-lg overflow-hidden">
            <button className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold tracking-wider uppercase text-[#99A1AF] hover:bg-[#F8F7F4] border-r border-[#E8E8EC] cursor-pointer">
              <ChevronLeft className="w-3 h-3" /> PREV
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold tracking-wider uppercase text-[#99A1AF] hover:bg-[#F8F7F4] cursor-pointer">
              NEXT <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF]">FRIENDS</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-green-500">{onlineFriends} Online</span>
              <span className="text-[10px] font-bold text-[#99A1AF]">{offlineFriends} Offline</span>
              <button
                onClick={() => setShowAddFriend(!showAddFriend)}
                className="w-5 h-5 flex items-center justify-center rounded bg-amber-400 hover:bg-amber-500 transition-colors cursor-pointer"
                title="Add Friend"
              >
                <UserPlus className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>

          {/* Add friend input */}
          <AnimatePresence>
            {showAddFriend && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-3"
              >
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Username or code..."
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                    className="flex-1 px-3 py-2 text-xs text-[#1a1a2e] bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg outline-none focus:border-amber-400 transition-colors placeholder:text-[#C4C4CC]"
                  />
                  <button
                    onClick={handleAddFriend}
                    className="px-3 py-2 rounded-lg border-2 border-amber-400 bg-amber-400 text-[10px] font-bold text-white hover:bg-amber-500 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#99A1AF]" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs text-[#1a1a2e] bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg outline-none focus:border-amber-400 transition-colors placeholder:text-[#C4C4CC]"
            />
          </div>
          <div className="space-y-1">
            {filteredFriends.map((friend) => (
              <div key={friend.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8F7F4] transition-colors">
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: friend.status !== "offline" ? `${friend.color}12` : "#F3F3F5", border: `1px solid ${friend.status !== "offline" ? friend.color + "30" : "#E8E8EC"}` }}
                  >
                    {friend.avatar}
                  </div>
                  {(friend.unread ?? 0) > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full">
                      {friend.unread}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${friend.status === "offline" ? "text-[#99A1AF]" : "text-[#1a1a2e]"}`}>{friend.name}</div>
                  <div className="flex items-center gap-1">
                    <Circle className="w-2 h-2" fill={friend.status === "online" ? "#22c55e" : friend.status === "in-game" ? "#eab308" : "#d4d4d8"} stroke="none" />
                    <span className={`text-[9px] font-bold tracking-wider uppercase ${friend.status === "online" ? "text-green-500" : friend.status === "in-game" ? "text-amber-500" : "text-[#C4C4CC]"}`}>
                      {friend.status === "in-game" ? "IN GAME" : friend.status === "online" ? "ONLINE" : friend.lastSeen}
                    </span>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setChatFriendId(friend.id); setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, unread: 0 } : f)); }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-50 text-[#99A1AF] hover:text-amber-500 transition-colors cursor-pointer"
                    title="Chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRemoveFriendId(friend.id)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[#99A1AF] hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove Friend"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─── Remove Friend Confirm Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {removeFriendId && removeFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setRemoveFriendId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[360px] bg-white rounded-xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-black tracking-[1.5px] uppercase text-[#1a1a2e] mb-2">Remove Friend</h3>
              <p className="text-xs text-[#717182] mb-5">
                Are you sure you want to remove <span className="font-bold text-[#1a1a2e]">{removeFriend.name}</span> from your friends list?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveFriendId(null)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-[#E8E8EC] bg-white text-xs font-bold tracking-[1px] uppercase text-[#717182] hover:bg-[#F3F3F6] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveFriend(removeFriendId)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-red-400 bg-red-400 text-xs font-bold tracking-[1px] uppercase text-white hover:bg-red-500 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Inline Chat Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {chatFriendId && chatFriend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-[280px] w-[360px] h-[420px] bg-white rounded-tl-xl border-t border-l border-[#E8E8EC] flex flex-col overflow-hidden z-40"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8EC]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: `${chatFriend.color}12`, border: `1px solid ${chatFriend.color}30` }}
                >
                  {chatFriend.avatar}
                </div>
                <div>
                  <div className="text-xs font-black text-[#1a1a2e]">{chatFriend.name}</div>
                  <div className="flex items-center gap-1">
                    <Circle className="w-2 h-2" fill={chatFriend.status === "online" ? "#22c55e" : chatFriend.status === "in-game" ? "#eab308" : "#d4d4d8"} stroke="none" />
                    <span className="text-[8px] font-bold tracking-wider uppercase text-[#99A1AF]">
                      {chatFriend.status === "in-game" ? "IN GAME" : chatFriend.status === "online" ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setChatFriendId(null)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F8F7F4] rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-[#99A1AF]" />
              </button>
            </div>
            {/* Chat body */}
            <div className="flex-1 flex items-center justify-center px-5">
              <p className="text-xs text-[#C4C4CC] text-center">No messages yet. Say hello!</p>
            </div>
            {/* Chat input */}
            <div className="px-4 py-3 border-t border-[#E8E8EC]">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-xs text-[#1a1a2e] bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg outline-none focus:border-amber-400 transition-colors placeholder:text-[#C4C4CC]"
                />
                <button className="px-4 py-2 rounded-lg border-2 border-amber-400 bg-amber-400 text-xs font-bold text-white hover:bg-amber-500 transition-colors cursor-pointer">
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Matchmaking Overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {matchPhase !== "idle" && matchMode && (
          <MatchmakingOverlay
            mode={matchMode}
            phase={matchPhase}
            onCancel={() => { setMatchPhase("idle"); setMatchMode(null); setSelectedMode(null); }}
            onAccept={() => router.push("/play")}
            onDecline={() => { setMatchPhase("idle"); setMatchMode(null); setSelectedMode(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
