"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Store, Package, Gift, BarChart3, Newspaper,
  Bell, Settings, Crown, Shield, X, Gem,
} from "lucide-react";

// ─── Sidebar Config ─────────────────────────────────────────────────────────

type SidebarItem = {
  id: string;
  label: string;
  sub?: string;
  icon: typeof Users;
  href: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "teams", label: "PLAY", sub: "SETTLERS", icon: Users, href: "/" },
  { id: "shop", label: "SHOP", sub: "MARKETPLACE", icon: Store, href: "/shop" },
  { id: "inventory", label: "INVENTORY", sub: "COLLECTION", icon: Package, href: "/inventory" },
  { id: "daily", label: "DAILY BONUS", sub: "REWARDS", icon: Gift, href: "/daily" },

  { id: "leaderboard", label: "LEADERBOARD", sub: "RANKINGS", icon: BarChart3, href: "/leaderboard" },
  { id: "news", label: "NEWS", sub: "UPDATES", icon: Newspaper, href: "/news" },
];

function getActiveId(pathname: string): string {
  if (pathname === "/shop") return "shop";
  if (pathname === "/inventory") return "inventory";
  if (pathname === "/daily") return "daily";
  if (pathname.startsWith("/news")) return "news";
  if (pathname === "/leaderboard") return "leaderboard";
  return "teams";
}

const NOTIFICATIONS = [
  { id: "1", title: "Trade Request", text: "Trade request from Player 2", time: "2m ago", color: "#E3B448", category: "TRADE" },
  { id: "2", title: "Season Rewards", text: "Season 3 rewards available!", time: "1h ago", color: "#2D5A27", category: "REWARD" },
  { id: "3", title: "Game Invite", text: "IronWarrior sent you a game invite", time: "3h ago", color: "#A04028", category: "INVITE" },
];

// ─── Layout ─────────────────────────────────────────────────────────────────

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = getActiveId(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8F7F4] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══ TOP HEADER BAR ═══════════════════════════════════════════════════ */}
      <header className="h-[68px] shrink-0 flex items-center justify-between px-6 bg-white border-b border-[#E8E8EC]">
        {/* Left: User */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#1a1a2e] text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-400/30">
              24
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e]">TUTANKHAMIN</div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black tracking-wider uppercase text-amber-600">BRONZE II</span>
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-2 h-1.5 rounded-sm bg-amber-500" />
                ))}
                <div className="w-2 h-1.5 rounded-sm bg-[#E8E8EC]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Currency + Actions */}
        <div className="flex items-center gap-3">
          <Link href="/shop" className="flex items-center gap-2 bg-[#F8F7F4] border border-[#E8E8EC] px-3 py-1.5 cursor-pointer hover:bg-[#EFEEEB] transition-colors">
            <Gem className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-black text-[#1a1a2e]">1,957</span>
          </Link>

          <div className="w-px h-8 bg-[#E8E8EC]" />

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-10 h-10 flex items-center justify-center bg-[#F8F7F4] border border-[#E8E8EC] hover:bg-[#EFEEEB] transition-colors cursor-pointer"
            >
              <Bell className="w-[18px] h-[18px] text-[#717182]" />
              <div className="absolute -top-1 left-7 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center">3</div>
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-[340px] bg-white rounded-xl shadow-2xl border border-[#E8E8EC] z-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <span className="text-base font-black tracking-[1.2px] uppercase text-[#1a1a2e]">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F8F7F4] rounded-lg transition-colors">
                    <X className="w-4 h-4 text-[#99A1AF]" />
                  </button>
                </div>
                <div className="px-3 pb-4 space-y-1.5">
                  {NOTIFICATIONS.map((n) => (
                    <div
                      key={n.id}
                      className="relative min-h-[55px] flex items-center pl-5 pr-3 py-2.5 cursor-pointer transition-all overflow-hidden hover:brightness-95"
                      style={{ background: `${n.color}08` }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: n.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-black tracking-[1px] uppercase" style={{ color: n.color }}>{n.category}</span>
                          <span className="text-[8px] font-bold tracking-wider uppercase text-[#C4C4CC]">{n.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-[#1a1a2e] truncate">{n.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/settings" className="w-10 h-10 flex items-center justify-center bg-[#F8F7F4] border border-[#E8E8EC] hover:bg-[#EFEEEB] transition-colors">
            <Settings className="w-[18px] h-[18px] text-[#717182]" />
          </Link>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 bg-white border-r border-[#E8E8EC] flex flex-col">
          <nav className="flex-1 py-4 px-3 space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              return (
                <Link key={item.id} href={item.href}>
                  <div
                    className={`relative flex items-center gap-3 px-4 py-4 cursor-pointer transition-all overflow-hidden ${
                      isActive
                        ? "bg-[rgba(227,180,72,0.08)] text-[#1a1a2e]"
                        : "text-[#717182] hover:bg-[#F8F7F4] hover:text-[#1a1a2e]"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E3B448]" />
                    )}
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center ${
                      isActive
                        ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(0,0,0,0.08)]"
                        : ""
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-black tracking-[1.9px] uppercase">{item.label}</div>
                      {item.sub && isActive && (
                        <div className="text-[10px] font-bold tracking-wider uppercase text-[#E3B448] mt-0.5">{item.sub}</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-4">
            <div
              className="relative overflow-hidden p-5 bg-white border border-[#E8E8EC] border-b-[3.5px] border-b-[#e3b448]"
              style={{
                boxShadow: "inset 0px 0px 20px rgba(227,180,72,0.08)",
              }}
            >
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-[rgba(227,180,72,0.15)] border-[0.5px] border-[rgba(227,180,72,0.3)]">
                  <Shield className="w-6 h-6 text-[#e3b448]" />
                </div>
                <div>
                  <div className="text-[10px] font-black tracking-[1.1px] uppercase text-[#e3b448]">CURRENT EVENT</div>
                  <div className="text-lg font-black tracking-[1.4px] text-[#1a1a2e]">SEASON 3</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── PAGE CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>
      </div>

      {/* ═══ BOTTOM BAR ══════════════════════════════════════════════════════ */}
      <footer className="h-10 shrink-0 flex items-center justify-between px-6 bg-white border-t border-[#E8E8EC]">
        <div className="flex gap-8">
          {["Documentation", "Support", "Privacy", "Changelog"].map((link) => (
            <span key={link} className="text-[10px] font-bold tracking-[2px] uppercase text-[#99A1AF] hover:text-[#717182] cursor-pointer transition-colors">{link}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#C4C4CC] tracking-wider">BUILD VER 3.4.1.092</span>
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
        </div>
      </footer>
    </div>
  );
}
