"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, BarChart3, Settings as SettingsIcon, Crown, Shield, Swords,
  Trophy, Target, Route, Castle, Mail, LogOut, AlertTriangle, User,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getRankFromElo, getPlacementInfo } from "@catan/core";

type ProfileTab = "inventory" | "stats" | "settings";

const TABS: { key: ProfileTab; label: string; icon: typeof Package }[] = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "settings", label: "Account", icon: User },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("inventory");
  const { user, loginWithGoogle, sendMagicLink, logout } = useAuth();
  const router = useRouter();
  const rank = getRankFromElo(user?.eloRating ?? 1000, user?.rankedGamesPlayed ?? 0);
  const placement = getPlacementInfo(user?.rankedGamesPlayed ?? 0);

  const [logoutDialog, setLogoutDialog] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [linkEmail, setLinkEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  return (
    <main className="flex-1 overflow-y-auto">
      {/* ─── Profile Header ───────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E8E8EC] px-6 pt-6 pb-0">
        <div className="flex items-center gap-5 mb-5">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#1a1a2e] text-[9px] font-black px-2 py-0.5 rounded border" style={{ color: rank.color, borderColor: `${rank.color}40` }}>
              {user?.level ?? 1}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-[2px] text-[#1a1a2e]">
                {user?.name}<span className="text-[#99A1AF] font-bold">#{user?.tag}</span>
              </h1>
              {user?.isGuest && (
                <span className="text-[9px] font-bold tracking-[1px] uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">Misafir</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {placement.isPlacing ? (
                <span className="text-xs font-bold text-[#717182]">UNRANKED — {placement.gamesPlayed}/{placement.gamesRequired} placement</span>
              ) : (
                <>
                  <span className="text-xs font-black tracking-wider uppercase" style={{ color: rank.color }}>{rank.tierLabel} {rank.divisionLabel}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: rank.maxStars }, (_, i) => (
                      <div key={i} className="w-2.5 h-2 rounded-sm" style={{ background: i < rank.stars ? rank.color : '#E8E8EC' }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#99A1AF]">{user?.eloRating} ELO</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                  activeTab === t.key ? "text-amber-600" : "text-[#99A1AF] hover:text-[#717182]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {activeTab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Tab Content ──────────────────────────────────────────── */}
      <div className="px-6 py-6">

        {/* ── Inventory Tab ──────────────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Avatars", count: 1, icon: User },
                { label: "Borders", count: 0, icon: Shield },
                { label: "Emotes", count: 0, icon: "😄" },
                { label: "Effects", count: 0, icon: "✨" },
              ].map((cat) => (
                <div key={cat.label} className="bg-white rounded-xl border border-[#E8E8EC] p-4 text-center">
                  <div className="text-2xl mb-1">
                    {typeof cat.icon === "string" ? cat.icon : <cat.icon className="w-6 h-6 mx-auto text-[#717182]" />}
                  </div>
                  <div className="text-lg font-black text-[#1a1a2e]">{cat.count}</div>
                  <div className="text-[9px] font-bold tracking-[1px] uppercase text-[#99A1AF]">{cat.label}</div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[#E8E8EC] bg-white">
              <div className="text-center">
                <Package className="w-10 h-10 text-[#E8E8EC] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#99A1AF]">Henüz item yok</p>
                <p className="text-xs text-[#C4C4CC] mt-1">Shop'tan item satın alabilirsin</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Tab ──────────────────────────────────────────── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Rank Card */}
            <div className="bg-white rounded-2xl border border-[#E8E8EC] p-6">
              <h3 className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e] mb-4">Rank</h3>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: `${rank.color}15`, border: `2px solid ${rank.color}30` }}>
                  <Crown className="w-10 h-10" style={{ color: rank.color }} />
                </div>
                <div>
                  {placement.isPlacing ? (
                    <>
                      <div className="text-lg font-black text-[#717182]">UNRANKED</div>
                      <div className="text-sm text-[#99A1AF]">{placement.gamesPlayed}/{placement.gamesRequired} placement maç tamamlandı</div>
                      <div className="w-32 h-2 bg-[#E8E8EC] rounded-full mt-2">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(placement.gamesPlayed / placement.gamesRequired) * 100}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-black" style={{ color: rank.color }}>{rank.tierLabel} {rank.divisionLabel}</div>
                      <div className="text-sm text-[#99A1AF]">{user?.eloRating} ELO</div>
                      <div className="flex gap-1 mt-1">
                        {Array.from({ length: rank.maxStars }, (_, i) => (
                          <div key={i} className="w-3 h-2.5 rounded-sm" style={{ background: i < rank.stars ? rank.color : '#E8E8EC' }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Oyun", value: "0", icon: Swords, color: "#1a1a2e" },
                { label: "Galibiyet", value: "0", icon: Trophy, color: "#22c55e" },
                { label: "Win Rate", value: "—", icon: Target, color: "#eab308" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-[#E8E8EC] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-[9px] font-bold tracking-[1px] uppercase text-[#99A1AF]">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-black text-[#1a1a2e]">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Achievement Stats */}
            <div className="bg-white rounded-2xl border border-[#E8E8EC] p-6">
              <h3 className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e] mb-4">Başarımlar</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "En Uzun Yol", value: "0", icon: Route },
                  { label: "En Büyük Ordu", value: "0", icon: Shield },
                  { label: "Toplam VP", value: "0", icon: Castle },
                  { label: "Toplam Trade", value: "0", icon: Swords },
                ].map((ach) => (
                  <div key={ach.label} className="flex items-center gap-3 py-2">
                    <ach.icon className="w-5 h-5 text-[#C4C4CC]" />
                    <div>
                      <div className="text-xs text-[#99A1AF]">{ach.label}</div>
                      <div className="text-sm font-black text-[#1a1a2e]">{ach.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Settings Tab ───────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {/* Account Info */}
            <div className="bg-white rounded-2xl border border-[#E8E8EC] p-6">
              <h3 className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e] mb-4">Hesap Bilgileri</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                  <span className="text-sm text-[#717182]">İsim</span>
                  {!editingName ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1a1a2e]">{user?.name}<span className="text-[#99A1AF]">#{user?.tag}</span></span>
                      <button onClick={() => { setNewName(user?.name || ""); setEditingName(true); }} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer">Düzenle</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newName} onChange={e => setNewName(e.target.value)} maxLength={20} autoFocus
                        className="h-8 w-40 px-2 bg-[#F8F7F4] border border-[#E8E8EC] rounded text-sm font-bold text-[#1a1a2e] focus:outline-none focus:border-amber-400"
                        onKeyDown={e => { if (e.key === "Escape") setEditingName(false); }} />
                      <span className="text-sm text-[#99A1AF]">#{user?.tag}</span>
                      <button onClick={() => { if (newName.trim().length >= 2) setEditingName(false); }} className="text-[10px] font-bold text-green-600 cursor-pointer">Kaydet</button>
                      <button onClick={() => setEditingName(false)} className="text-[10px] font-bold text-[#99A1AF] cursor-pointer">İptal</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                  <span className="text-sm text-[#717182]">Email</span>
                  <span className="text-sm font-bold text-[#1a1a2e]">{user?.email || "Bağlı değil"}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#717182]">Hesap Türü</span>
                  <span className={`text-xs font-bold tracking-[1px] uppercase px-2 py-0.5 rounded ${user?.isGuest ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {user?.isGuest ? "Misafir" : "Kayıtlı"}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Linking */}
            {user?.isGuest && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black tracking-[1px] uppercase text-amber-800">Hesabını Bağla</h3>
                    <p className="text-xs text-amber-700 mt-1">Misafir hesabın kalıcı değil. İlerlemenin kaybolmaması için bağla.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={loginWithGoogle}
                    className="w-full flex items-center gap-3 h-11 px-4 bg-white border border-[#E8E8EC] rounded-lg hover:bg-[#F8F7F4] transition-colors font-semibold text-sm text-[#1a1a2e] cursor-pointer">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google ile Bağla
                  </button>
                  {!emailSent ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4C4CC]" />
                        <input type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="email@adresin.com"
                          className="w-full h-11 pl-10 pr-3 bg-white border border-[#E8E8EC] rounded-lg text-sm font-medium text-[#1a1a2e] placeholder:text-[#C4C4CC] focus:outline-none focus:border-amber-400" />
                      </div>
                      <button onClick={() => { if (linkEmail.includes("@")) sendMagicLink(linkEmail).then(() => setEmailSent(true)); }}
                        className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs tracking-[1px] uppercase rounded-lg transition-colors cursor-pointer shrink-0">Bağla</button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold text-green-700">✓ {linkEmail} adresine link gönderildi!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="bg-white rounded-2xl border border-[#E8E8EC] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e]">Oturum</h3>
                  {user?.isGuest && <p className="text-[10px] text-red-400 mt-1">⚠ Misafir hesabından çıkarsan ilerlemen kaybolur.</p>}
                </div>
                <button onClick={() => setLogoutDialog(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Dialog */}
      {logoutDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[400px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-2">Çıkış Yap</h3>
              {user?.isGuest ? (
                <>
                  <p className="text-sm text-[#717182] mb-1">Misafir hesabından çıkış yapıyorsun.</p>
                  <p className="text-sm font-bold text-red-600">Tüm ilerlemen kalıcı olarak silinecek!</p>
                </>
              ) : (
                <p className="text-sm text-[#717182]">Oturumunu kapatmak istediğine emin misin?</p>
              )}
            </div>
            <div className="flex border-t border-[#E8E8EC]">
              <button onClick={() => setLogoutDialog(false)} className="flex-1 py-3 text-sm font-bold text-[#717182] hover:bg-[#F8F7F4] transition-colors cursor-pointer">Vazgeç</button>
              <div className="w-px bg-[#E8E8EC]" />
              <button onClick={async () => { setLogoutDialog(false); await logout(); router.push("/"); }}
                className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                {user?.isGuest ? "Evet, Çıkış Yap" : "Çıkış Yap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
