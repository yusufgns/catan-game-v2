"use client";

import { useState } from "react";
import {
  Crown, Medal, Trophy, Users, Calendar, UserPlus,
  X, UserPlus2, Swords, Clock, TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaderboardTab = "global" | "season" | "weekly" | "guilds" | "friends";

interface Player {
  rank: number;
  name: string;
  level: number;
  trophies: number;
  wins: number;
  winRate: number;
  isYou?: boolean;
  avatar: string;
  totalGames: number;
  longestRoad: number;
  largestArmy: number;
  joinedDate: string;
  status: "online" | "in-game" | "offline";
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TABS: { key: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
  { key: "global", label: "Global Rankings", icon: Trophy },
  { key: "season", label: "Season 3", icon: Medal },
  { key: "weekly", label: "This Week", icon: Calendar },
  { key: "guilds", label: "Top Guilds", icon: Users },
  { key: "friends", label: "Friends", icon: UserPlus },
];

const PLAYERS: Player[] = [
  { rank: 1,   name: "Legendary_Phoenix", level: 50, trophies: 12450, wins: 1240, winRate: 82, avatar: "🏆", totalGames: 1512, longestRoad: 342, largestArmy: 289, joinedDate: "Jan 2024", status: "online" },
  { rank: 2,   name: "Shadow_Master",     level: 48, trophies: 11890, wins: 1150, winRate: 79, avatar: "🥈", totalGames: 1456, longestRoad: 310, largestArmy: 265, joinedDate: "Feb 2024", status: "in-game" },
  { rank: 3,   name: "Dragon_Slayer_X",   level: 47, trophies: 11250, wins: 1080, winRate: 81, avatar: "🥉", totalGames: 1333, longestRoad: 298, largestArmy: 245, joinedDate: "Mar 2024", status: "offline" },
  { rank: 4,   name: "Crystal_Queen",     level: 46, trophies: 10890, wins: 1020, winRate: 78, avatar: "👑", totalGames: 1308, longestRoad: 280, largestArmy: 230, joinedDate: "Jan 2024", status: "online" },
  { rank: 5,   name: "Thunder_King",      level: 45, trophies: 10450, wins: 980,  winRate: 77, avatar: "⚡", totalGames: 1273, longestRoad: 265, largestArmy: 218, joinedDate: "Apr 2024", status: "offline" },
  { rank: 6,   name: "Mystic_Warrior",    level: 44, trophies: 9980,  wins: 940,  winRate: 76, avatar: "🔮", totalGames: 1237, longestRoad: 248, largestArmy: 205, joinedDate: "May 2024", status: "online" },
  { rank: 7,   name: "Steel_Champion",    level: 43, trophies: 9520,  wins: 900,  winRate: 75, avatar: "🛡️", totalGames: 1200, longestRoad: 232, largestArmy: 190, joinedDate: "Mar 2024", status: "offline" },
  { rank: 8,   name: "Flame_Emperor",     level: 42, trophies: 9180,  wins: 870,  winRate: 74, avatar: "🔥", totalGames: 1176, longestRoad: 220, largestArmy: 178, joinedDate: "Jun 2024", status: "in-game" },
  { rank: 9,   name: "Ice_Titan",         level: 41, trophies: 8850,  wins: 840,  winRate: 73, avatar: "❄️", totalGames: 1151, longestRoad: 205, largestArmy: 165, joinedDate: "Jul 2024", status: "offline" },
  { rank: 10,  name: "Storm_Blade",       level: 40, trophies: 8520,  wins: 810,  winRate: 72, avatar: "⚔️", totalGames: 1125, longestRoad: 190, largestArmy: 155, joinedDate: "Aug 2024", status: "online" },
  { rank: 142, name: "TUTANKHAMIN",       level: 24, trophies: 4580,  wins: 285,  winRate: 68, avatar: "👑", totalGames: 419, longestRoad: 78, largestArmy: 52, joinedDate: "Dec 2024", status: "online", isYou: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRankDisplay(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-500" />;
  if (rank === 2) return <Crown className="w-5 h-5 text-[#A0A0A0]" />;
  if (rank === 3) return <Crown className="w-5 h-5 text-[#CD7F32]" />;
  return <span className="text-sm font-black text-[#99A1AF]">{rank}</span>;
}

function getPageNumbers(_current: number, total: number): number[] {
  return Array.from({ length: total }, (_, i) => i + 1);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Player Detail Panel ─────────────────────────────────────────────────────

function PlayerDetail({ player, onClose }: { player: Player; onClose: () => void }) {
  const statusColor = player.status === "online" ? "#22c55e" : player.status === "in-game" ? "#eab308" : "#d4d4d8";
  const statusLabel = player.status === "in-game" ? "IN GAME" : player.status.toUpperCase();

  return (
    <div className="w-[320px] shrink-0 border-l border-[#E8E8EC] bg-white overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-[#E8E8EC]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF]">Player Profile</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-[#F8F7F4] rounded transition-colors">
            <X className="w-4 h-4 text-[#99A1AF]" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl border-2 ${
            player.isYou ? "bg-amber-100 border-amber-300" : "bg-[#F3F3F5] border-[#E8E8EC]"
          }`}>
            {player.avatar}
          </div>
          <div>
            <div className={`text-base font-black uppercase tracking-wide ${player.isYou ? "text-amber-600" : "text-[#1a1a2e]"}`}>
              {player.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
              <span className={`text-[9px] font-bold tracking-wider uppercase ${
                player.status === "online" ? "text-green-500" : player.status === "in-game" ? "text-amber-500" : "text-[#C4C4CC]"
              }`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!player.isYou && (
          <button className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-amber-400 bg-amber-400 text-white text-[10px] font-bold tracking-[1px] uppercase rounded-lg hover:bg-amber-500 transition-colors cursor-pointer">
            <UserPlus2 className="w-3.5 h-3.5" />
            Add Friend
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="p-5 border-b border-[#E8E8EC]">
        <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF] block mb-3">Stats</span>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Rank" value={`#${player.rank}`} icon={<Trophy className="w-3.5 h-3.5 text-amber-500" />} />
          <StatCard label="Level" value={`Lv.${player.level}`} icon={<TrendingUp className="w-3.5 h-3.5 text-amber-500" />} />
          <StatCard label="Trophies" value={formatNumber(player.trophies)} color="text-amber-600" />
          <StatCard label="Win Rate" value={`${player.winRate}%`} color={player.winRate >= 80 ? "text-green-500" : "text-amber-600"} />
        </div>
      </div>

      {/* Match History */}
      <div className="p-5 border-b border-[#E8E8EC]">
        <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF] block mb-3">Match History</span>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Total Games</span>
            <span className="text-xs font-black text-[#1a1a2e]">{formatNumber(player.totalGames)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Wins</span>
            <span className="text-xs font-black text-green-500">{formatNumber(player.wins)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Losses</span>
            <span className="text-xs font-black text-[#99A1AF]">{formatNumber(player.totalGames - player.wins)}</span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="p-5">
        <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF] block mb-3">Achievements</span>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Longest Road</span>
            <span className="text-xs font-black text-[#1a1a2e]">{player.longestRoad}x</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Largest Army</span>
            <span className="text-xs font-black text-[#1a1a2e]">{player.largestArmy}x</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#717182]">Joined</span>
            <span className="text-xs font-bold text-[#99A1AF]">{player.joinedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="p-3 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] font-bold tracking-wider uppercase text-[#99A1AF]">{label}</span>
      </div>
      <span className={`text-base font-black ${color || "text-[#1a1a2e]"}`}>{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("global");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 15;

  return (
    <div className="flex flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-[#F8F7F4] border-b border-[#E8E8EC] px-6 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black tracking-[3px] uppercase text-[#1a1a2e]">Full Rankings</h1>
              <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">All Players &bull; Updated Live</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                  activeTab === t.key
                    ? "text-amber-600"
                    : "text-[#99A1AF] hover:text-[#717182]"
                }`}
              >
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── Table Header (sticky) ────────────────────────────────────── */}
        <div className="sticky top-[105px] z-[9] px-6 pt-4 bg-[#F8F7F4]">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F3F3F5] border border-[#E8E8EC] rounded-lg text-[9px] font-black tracking-[1px] uppercase text-[#99A1AF]">
            <div className="w-14 text-center">Rank</div>
            <div className="flex-1">Player</div>
            <div className="w-16 text-center">Level</div>
            <div className="w-20 text-center">Trophies</div>
            <div className="w-16 text-center">Wins</div>
            <div className="w-20 text-center">Win Rate</div>
          </div>
        </div>

        {/* ─── Rows ──────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6">
          <div className="space-y-1 mt-2">
            {PLAYERS.map((player) => {
              const isTop3 = player.rank <= 3;
              const isSelected = selectedPlayer?.rank === player.rank;
              return (
                <div
                  key={player.rank}
                  onClick={() => setSelectedPlayer(player)}
                  className={`flex items-center gap-2 px-4 py-3.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-300/60 shadow-sm"
                      : player.isYou
                      ? "bg-amber-50/80 border-amber-300/50 hover:bg-amber-100/60"
                      : "bg-white border-[#E8E8EC] hover:bg-[#F8F7F4]"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-14 flex items-center justify-center">
                    {getRankDisplay(player.rank)}
                  </div>

                  {/* Player */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm border ${
                      player.isYou
                        ? "bg-amber-100 border-amber-300"
                        : "bg-[#F3F3F5] border-[#E8E8EC]"
                    }`}>
                      {player.avatar}
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wide ${
                      player.isYou ? "text-amber-600" : "text-[#1a1a2e]"
                    }`}>
                      {player.name}
                      {player.isYou && <span className="text-[10px] font-bold text-amber-500 ml-2">(YOU)</span>}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="w-16 text-center">
                    <span className="text-sm font-black text-[#1a1a2e]">Lv.{player.level}</span>
                  </div>

                  {/* Trophies */}
                  <div className="w-20 text-center">
                    <span className="text-sm font-black text-amber-600">{formatNumber(player.trophies)}</span>
                  </div>

                  {/* Wins */}
                  <div className="w-16 text-center">
                    <span className="text-sm font-bold text-[#717182]">{formatNumber(player.wins)}</span>
                  </div>

                  {/* Win Rate */}
                  <div className="w-20 text-center">
                    <span className={`text-sm font-black ${
                      player.winRate >= 80 ? "text-green-500" : player.winRate >= 75 ? "text-amber-600" : "text-[#717182]"
                    }`}>
                      {player.winRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-[10px] font-bold text-[#99A1AF]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[10px] font-bold tracking-[1px] uppercase border border-[#E8E8EC] rounded-md hover:bg-[#F8F7F4] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-[#717182]"
              >
                Prev
              </button>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="h-8 px-2 text-[11px] font-black text-[#1a1a2e] bg-white border border-[#E8E8EC] rounded-md hover:bg-[#F8F7F4] transition-colors cursor-pointer appearance-none text-center w-20"
              >
                {getPageNumbers(currentPage, totalPages).map((p) => (
                  <option key={p} value={p}>Page {p}</option>
                ))}
              </select>
              <span className="text-[10px] text-[#99A1AF]">of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[10px] font-bold tracking-[1px] uppercase border border-[#E8E8EC] rounded-md hover:bg-[#F8F7F4] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-[#717182]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Player Detail Panel ───────────────────────────────────────── */}
      {selectedPlayer && (
        <PlayerDetail player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
