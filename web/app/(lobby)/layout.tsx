"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Store, Package, Gift, BarChart3, Newspaper,
  Bell, Settings, Crown, Shield, X, Gem, Mail, User, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getRankFromElo, getPlacementInfo } from "@catan/core";

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
  { id: "profile", label: "PROFILE", sub: "MY ACCOUNT", icon: User, href: "/profile" },
  { id: "shop", label: "SHOP", sub: "MARKETPLACE", icon: Store, href: "/shop" },
  { id: "leaderboard", label: "LEADERBOARD", sub: "RANKINGS", icon: BarChart3, href: "/leaderboard" },
  { id: "daily", label: "DAILY BONUS", sub: "REWARDS", icon: Gift, href: "/daily" },
  { id: "news", label: "NEWS", sub: "UPDATES", icon: Newspaper, href: "/news" },
];

function getActiveId(pathname: string): string {
  if (pathname === "/shop") return "shop";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname === "/daily") return "daily";
  if (pathname.startsWith("/news")) return "news";
  if (pathname === "/leaderboard") return "leaderboard";
  if (pathname === "/settings") return "settings";
  if (pathname === "/") return "teams";
  return "";
}

const NOTIFICATIONS = [
  { id: "1", title: "Trade Request", text: "Trade request from Player 2", time: "2m ago", color: "#E3B448", category: "TRADE" },
  { id: "2", title: "Season Rewards", text: "Season 3 rewards available!", time: "1h ago", color: "#2D5A27", category: "REWARD" },
  { id: "3", title: "Game Invite", text: "IronWarrior sent you a game invite", time: "3h ago", color: "#A04028", category: "INVITE" },
];

// ─── Layout ─────────────────────────────────────────────────────────────────

function AuthDialog() {
  const { loginAsGuest, loginWithGoogle, sendMagicLink, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"main" | "email">("main");
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleGuest() {
    setBusy(true); setError("");
    try { await loginAsGuest(guestName || undefined); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function handleMagicLink() {
    if (!email.includes("@")) { setError("Geçerli bir email gir"); return; }
    setBusy(true); setError("");
    try { await sendMagicLink(email); setEmailSent(true); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[440px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 px-8 pt-8 pb-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-[3px] uppercase text-[#1a1a2e]">CATAN</h2>
          <p className="text-sm text-[#717182] mt-1">Hesap oluştur ve oynamaya başla!</p>
        </div>

        {/* Auth Options */}
        <div className="px-8 py-6 space-y-3">
          {tab === "main" && !emailSent && (
            <>
              {/* Google */}
              <button
                onClick={loginWithGoogle}
                disabled={busy}
                className="w-full flex items-center gap-3 h-12 px-4 bg-white border border-[#E8E8EC] rounded-lg hover:bg-[#F8F7F4] transition-colors font-semibold text-sm text-[#1a1a2e] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google ile Devam Et
              </button>

              {/* Discord (placeholder) */}
              <button
                disabled
                className="w-full flex items-center gap-3 h-12 px-4 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg font-semibold text-sm text-[#5865F2]/50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0 opacity-50" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z"/></svg>
                Discord ile Devam Et <span className="ml-auto text-[9px] tracking-wider uppercase opacity-60">Yakında</span>
              </button>

              {/* Apple (placeholder) */}
              <button
                disabled
                className="w-full flex items-center gap-3 h-12 px-4 bg-black/5 border border-black/10 rounded-lg font-semibold text-sm text-black/30 cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0 opacity-30" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple ile Devam Et <span className="ml-auto text-[9px] tracking-wider uppercase opacity-60">Yakında</span>
              </button>

              {/* Email */}
              <button
                onClick={() => setTab("email")}
                className="w-full flex items-center gap-3 h-12 px-4 bg-white border border-[#E8E8EC] rounded-lg hover:bg-[#F8F7F4] transition-colors font-semibold text-sm text-[#1a1a2e] cursor-pointer"
              >
                <Mail className="w-5 h-5 text-[#717182] shrink-0" />
                Email ile Devam Et
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-[#E8E8EC]" />
                <span className="text-[9px] font-bold tracking-[2px] uppercase text-[#C4C4CC]">VEYA</span>
                <div className="flex-1 h-px bg-[#E8E8EC]" />
              </div>

              {/* Guest */}
              <div className="flex gap-2 pt-1">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4C4CC]" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="Takma ad"
                    maxLength={20}
                    className="w-full h-11 pl-10 pr-3 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg text-sm font-medium text-[#1a1a2e] placeholder:text-[#C4C4CC] focus:outline-none focus:border-amber-400 transition-colors"
                    onKeyDown={e => e.key === "Enter" && handleGuest()}
                  />
                </div>
                <button
                  onClick={handleGuest}
                  disabled={busy}
                  className="h-11 px-5 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-bold text-xs tracking-[1.5px] uppercase rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {busy ? "..." : "Misafir"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {tab === "email" && !emailSent && (
            <>
              <button onClick={() => setTab("main")} className="text-[10px] font-bold tracking-[2px] uppercase text-[#99A1AF] hover:text-[#1a1a2e] cursor-pointer">← GERİ</button>
              <p className="text-xs text-[#717182]">Sana giriş linki göndereceğiz.</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4C4CC]" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@adresin.com"
                  className="w-full h-11 pl-10 pr-3 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg text-sm font-medium text-[#1a1a2e] placeholder:text-[#C4C4CC] focus:outline-none focus:border-amber-400"
                  onKeyDown={e => e.key === "Enter" && handleMagicLink()} />
              </div>
              <button onClick={handleMagicLink} disabled={busy || !email}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs tracking-[2px] uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                {busy ? "Gönderiliyor..." : "Giriş Linki Gönder"}
              </button>
            </>
          )}

          {emailSent && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-sm font-semibold text-[#1a1a2e]">{email} adresine link gönderildi!</p>
              <p className="text-xs text-[#99A1AF] mt-1">15 dakika geçerli.</p>
              <button onClick={() => { setEmailSent(false); setTab("main"); }}
                className="mt-4 text-xs font-bold text-amber-600 cursor-pointer">Geri Dön</button>
            </div>
          )}

          {error && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        <div className="px-8 pb-5 text-center">
          <p className="text-[9px] text-[#C4C4CC] tracking-wider">Devam ederek Kullanım Koşullarını kabul etmiş olursun.</p>
        </div>
      </div>
    </div>
  );
}

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = getActiveId(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const rank = getRankFromElo(user?.eloRating ?? 1000, user?.rankedGamesPlayed ?? 0);
  const placement = getPlacementInfo(user?.rankedGamesPlayed ?? 0);

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
            <div className="absolute -bottom-1 -right-1 bg-[#1a1a2e] text-[8px] font-black px-1.5 py-0.5 rounded border" style={{ color: rank.color, borderColor: `${rank.color}40` }}>
              {user?.level ?? 1}
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-[2px] text-[#1a1a2e]">
              {user?.name || "GUEST"}<span className="text-[#99A1AF] font-bold">#{user?.tag || "00000"}</span>
            </div>
            <div className="flex items-center gap-2">
              {placement.isPlacing ? (
                <>
                  <span className="text-[8px] font-black tracking-wider uppercase text-[#717182]">UNRANKED</span>
                  <span className="text-[8px] font-bold text-[#99A1AF]">{placement.gamesPlayed}/{placement.gamesRequired}</span>
                </>
              ) : (
                <>
                  <span className="text-[8px] font-black tracking-wider uppercase" style={{ color: rank.color }}>{rank.tierLabel} {rank.divisionLabel}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: rank.maxStars }, (_, i) => (
                      <div key={i} className="w-2 h-1.5 rounded-sm" style={{ background: i < rank.stars ? rank.color : '#E8E8EC' }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Currency + Actions */}
        <div className="flex items-center gap-3">
          <Link href="/shop" className="flex items-center gap-2 h-10 bg-amber-50 border border-amber-200 px-3 cursor-pointer hover:bg-amber-100 transition-colors">
            <Gem className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-black text-[#1a1a2e]">{user?.gems?.toLocaleString() || "0"}</span>
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

      {/* ═══ AUTH DIALOG (overlay when not logged in) ════════════════════════ */}
      {!loading && !user && <AuthDialog />}
    </div>
  );
}
