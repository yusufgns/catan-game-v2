"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InviteFriendsDialog } from "@/components/InviteFriendsDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Settings,
  UserPlus,
  Trophy,
  ArrowLeftRight,
  Timer,
  Map,
  Puzzle,
  Crown,
  Check,
  Clock,
  Play,
  X,
  Shuffle,
  Hexagon,
  Users,
  Lock,
  Globe,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PlayerStatus = "ready" | "waiting" | "empty";

interface PlayerSlot {
  id: string;
  name: string;
  status: PlayerStatus;
  color: string;
  isHost: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ROOM_ID = "#CXT-9921";
const ROOM_NAME = "CUSTOM LOBBY";

const EXPANSIONS = [
  { name: "Seafarers", enabled: false },
  { name: "Cities & Knights", enabled: false },
  { name: "Harbormaster", enabled: false },
];

const INITIAL_PLAYERS: (PlayerSlot | null)[] = [
  { id: "p1", name: "TUTANKHAMIN", status: "ready", color: "#EF4444", isHost: true },
  { id: "p2", name: "Guest_2812", status: "ready", color: "#3B82F6", isHost: false },
  null,
  null,
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<(PlayerSlot | null)[]>(INITIAL_PLAYERS);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [vpIndex, setVpIndex] = useState(1);
  const [tradeIndex, setTradeIndex] = useState(2);
  const [timerIndex, setTimerIndex] = useState(1);
  const [selectedMap, setSelectedMap] = useState("standard");
  const [isPublic, setIsPublic] = useState(false);
  const [randomSeed, setRandomSeed] = useState(true);
  const [expansions, setExpansions] = useState(EXPANSIONS);

  const toggleExpansion = (name: string) => {
    setExpansions(prev => prev.map(e => e.name === name ? { ...e, enabled: !e.enabled } : e));
  };

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

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(ROOM_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filledPlayers = players.filter(Boolean) as PlayerSlot[];
  const allReady = filledPlayers.length >= 2 && filledPlayers.every((p) => p.status === "ready");

  const MOCK_COLORS = ["#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#F97316"];

  const handleMockJoin = (name: string) => {
    setPlayers(prev => {
      const map = MAP_PRESETS.find(m => m.id === selectedMap)!;
      let slots = [...prev];
      // If no empty slot but map allows more, add one
      if (!slots.includes(null) && slots.length < map.max) {
        slots.push(null);
      }
      const emptyIdx = slots.indexOf(null);
      if (emptyIdx === -1) return prev;
      const usedColors = slots.filter(Boolean).map(p => (p as PlayerSlot).color);
      const color = MOCK_COLORS.find(c => !usedColors.includes(c)) || "#6B7280";
      slots[emptyIdx] = {
        id: `mock-${Date.now()}`,
        name,
        status: "ready",
        color,
        isHost: false,
      };
      return slots;
    });
  };

  const handleMapChange = (mapId: string) => {
    const map = MAP_PRESETS.find(m => m.id === mapId);
    if (!map) return;
    // Can't select if current filled players exceed map max
    if (filledPlayers.length > map.max) return;
    setSelectedMap(mapId);
    // Adjust slots to fit within new map range
    setPlayers(prev => {
      let slots = [...prev];
      // Remove empty slots from the end if exceeding max
      while (slots.length > map.max) {
        const idx = slots.lastIndexOf(null);
        if (idx === -1) break;
        slots = slots.filter((_, i) => i !== idx);
      }
      // Fill up to map max with empty slots
      while (slots.length < map.max) {
        slots.push(null);
      }
      return slots;
    });
  };

  return (
    <div className="h-screen bg-[#FAFAF8] text-[#1a1a2e] font-sans flex flex-col overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/5">
        <div className="px-8 md:px-16 py-3 flex items-center justify-between">
          {/* Left: Back + Room Info */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-[#717182] hover:text-[#1a1a2e] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-5 w-px bg-black/10" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                <Puzzle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#1a1a2e] leading-none">
                  {ROOM_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-[#717182]">{ROOM_ID}</span>
                  <button
                    onClick={handleCopyRoomId}
                    className="text-[#99A1AF] hover:text-[#1a1a2e] transition-colors"
                    title="Copy Room ID"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 px-8 md:px-16 py-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 h-full">
          {/* ─── Left Panel: Match Rules (2/3) ──────────────────────── */}
          <div className="lg:flex-[2] min-w-0 flex flex-col">
            {/* Match Rules Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1a1a2e]">Match Rules</h2>
                  <p className="text-xs text-[#717182] mt-0.5">
                    Game configuration for this lobby
                  </p>
                </div>
                <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  Custom
                </span>
              </div>

              {/* Rules Rows */}
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
                {activeExpansions.length > 0 && (
                  <div className="flex items-center gap-3 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F8F7F4] border border-[#E8E8EC] flex items-center justify-center shrink-0">
                      <Puzzle className="w-4 h-4 text-[#717182]" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-[#717182]">Expansions</span>
                    <span className="text-sm font-bold text-[#1a1a2e]">{activeExpansions.map(e => e.name).join(", ")}</span>
                  </div>
                )}
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
              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F3F3F5] border-2 border-[#E8E8EC] text-sm font-semibold text-[#1a1a2e] hover:bg-[#E8E8EC] transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Edit Settings
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-amber-400 bg-amber-400 text-sm font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Friends
                </button>
              </div>
            </div>
          </div>

          {/* ─── Right Panel: Players (1/3) ─────────────────────────── */}
          <div className="lg:flex-[1] min-w-0 flex flex-col">
            {/* Players Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#1a1a2e]">Players</h2>
                <span className="text-xs font-semibold text-[#717182] bg-[#F3F3F5] px-2.5 py-1 rounded-full">
                  {filledPlayers.length}/{activeMap.max}
                </span>
              </div>

              {/* Player Slots */}
              <div className="space-y-3 overflow-y-auto min-h-0 flex-1 pr-1">
                {players.map((player, index) => {
                  if (!player) {
                    // Empty slot
                    return (
                      <div
                        key={`empty-${index}`}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#E5E7EB]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] border border-dashed border-[#D1D5DB] flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-[#C7C7D1]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#C7C7D1]">
                            Empty Slot
                          </div>
                          <div className="text-[11px] text-[#D1D5DB]">
                            Waiting for player...
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-black/5"
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#1a1a2e] truncate">
                            {player.name}
                          </span>
                          {player.isHost && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {player.status === "ready" ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-[11px] font-medium text-green-500">
                                Ready
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span className="text-[11px] font-medium text-amber-500">
                                Waiting
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ready Up Button */}
              <button
                onClick={() => setIsReady(!isReady)}
                className={`w-full mt-5 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
                  isReady
                    ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300"
                }`}
              >
                {isReady ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Ready!
                  </span>
                ) : (
                  "Ready Up"
                )}
              </button>

              {/* Start Game Button */}
              <button
                disabled={!allReady}
                onClick={() => { if (allReady) router.push("/play"); }}
                className={`w-full mt-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  allReady
                    ? "border-2 border-amber-400 bg-amber-400 text-white hover:bg-amber-500 cursor-pointer"
                    : "bg-[#F3F3F5] text-[#C7C7D1] border-2 border-[#E8E8EC] cursor-not-allowed"
                }`}
              >
                <Play className="w-4 h-4" />
                Start Game
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Inline Settings Panel ──────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-[640px] max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
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
                {/* Match Rules */}
                <div className="space-y-4">
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
                            <button
                              key={opt}
                              onClick={() => rule.setIndex(i)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                rule.index === i
                                  ? "bg-[#1a1a2e] text-white"
                                  : "bg-[#F3F3F5] text-[#717182] hover:bg-[#E8E8EC]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lobby Visibility */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] border border-[#E8E8EC] flex items-center justify-center shrink-0">
                    {isPublic ? <Globe className="w-4 h-4 text-[#717182]" /> : <Lock className="w-4 h-4 text-[#717182]" />}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-[#1a1a2e]">Lobby Visibility</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        !isPublic ? "bg-[#1a1a2e] text-white" : "bg-[#F3F3F5] text-[#717182] hover:bg-[#E8E8EC]"
                      }`}
                    >
                      Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isPublic ? "bg-[#1a1a2e] text-white" : "bg-[#F3F3F5] text-[#717182] hover:bg-[#E8E8EC]"
                      }`}
                    >
                      Public
                    </button>
                  </div>
                </div>

                {/* Expansions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Puzzle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-[#1a1a2e]">Expansions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {expansions.map((exp) => (
                      <button
                        key={exp.name}
                        onClick={() => toggleExpansion(exp.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-2 ${
                          exp.enabled
                            ? "bg-amber-50 border-amber-400 text-[#1a1a2e]"
                            : "bg-[#F8F7F4] border-transparent text-[#99A1AF] hover:bg-[#F3F3F5]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            exp.enabled
                              ? "bg-amber-400 border-amber-400"
                              : "border-[#D1D5DB] bg-white"
                          }`}
                        >
                          {exp.enabled && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {exp.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Map Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Map className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-bold text-[#1a1a2e]">Map</span>
                    </div>
                    <button
                      onClick={() => setRandomSeed(!randomSeed)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        randomSeed ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-[#F3F3F5] text-[#717182]"
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Random Seed
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {MAP_PRESETS.map((preset) => {
                      const disabled = filledPlayers.length > preset.max;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => !disabled && handleMapChange(preset.id)}
                          className={`relative p-3 rounded-xl text-left transition-all border-2 ${
                            disabled
                              ? "bg-[#F9FAFB] border-transparent opacity-40 cursor-not-allowed"
                              : selectedMap === preset.id
                              ? "bg-amber-50 border-amber-400 cursor-pointer"
                              : "bg-[#F8F7F4] border-transparent hover:bg-[#F3F3F5] cursor-pointer"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E8EC] flex items-center justify-center mb-2">
                            <Hexagon className="w-4 h-4" style={{ color: selectedMap === preset.id ? "#f59e0b" : "#99A1AF" }} />
                          </div>
                          <div className="text-xs font-bold text-[#1a1a2e]">{preset.name}</div>
                          <div className="text-[10px] text-[#99A1AF] mt-0.5">{preset.desc}</div>
                          <div className="text-[9px] font-semibold text-[#C4C4CC] mt-1">{preset.min}-{preset.max} players</div>
                          {selectedMap === preset.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 rounded-lg border-2 border-amber-400 bg-amber-400 text-sm font-bold tracking-[1px] uppercase text-white hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Save Settings
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InviteFriendsDialog
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleMockJoin}
        hasEmptySlot={players.includes(null) || filledPlayers.length < activeMap.max}
        lobbyCode="CXT-9921"
      />
    </div>
  );
}
