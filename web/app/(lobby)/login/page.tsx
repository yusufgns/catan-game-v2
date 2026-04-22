"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Crown, Mail, User, ArrowRight, Check } from "lucide-react";

export default function LoginPage() {
  const { loginAsGuest, loginWithGoogle, sendMagicLink, user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"main" | "email">("main");
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Already logged in → redirect
  if (user && !loading) {
    router.replace("/");
    return null;
  }

  async function handleGuest() {
    setBusy(true);
    setError("");
    try {
      await loginAsGuest(guestName || undefined);
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email.includes("@")) { setError("Geçerli bir email gir"); return; }
    setBusy(true);
    setError("");
    try {
      await sendMagicLink(email);
      setEmailSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F8F7F4]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[420px] mx-4">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-[4px] uppercase text-[#1a1a2e]">CATAN</div>
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-600">ONLINE</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E8EC] p-8 shadow-sm">

          {tab === "main" && !emailSent && (
            <>
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-6 text-center">Giriş Yap</h2>

              {/* Google */}
              <button
                onClick={loginWithGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-[#E8E8EC] hover:bg-[#F8F7F4] transition-colors font-bold text-sm text-[#1a1a2e] tracking-wide mb-3 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google ile Giriş
              </button>

              {/* Email */}
              <button
                onClick={() => setTab("email")}
                className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-[#E8E8EC] hover:bg-[#F8F7F4] transition-colors font-bold text-sm text-[#1a1a2e] tracking-wide mb-6 cursor-pointer"
              >
                <Mail className="w-5 h-5 text-[#717182]" />
                Email ile Giriş
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[#E8E8EC]" />
                <span className="text-[10px] font-bold tracking-[2px] uppercase text-[#99A1AF]">VEYA</span>
                <div className="flex-1 h-px bg-[#E8E8EC]" />
              </div>

              {/* Guest */}
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A1AF]" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="Takma ad (opsiyonel)"
                    maxLength={20}
                    className="w-full h-12 pl-10 pr-4 bg-[#F8F7F4] border border-[#E8E8EC] text-sm font-semibold text-[#1a1a2e] placeholder:text-[#C4C4CC] focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <button
                  onClick={handleGuest}
                  disabled={busy}
                  className="w-full h-12 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-black text-sm tracking-[2px] uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {busy ? "..." : "Misafir Olarak Oyna"}
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {tab === "email" && !emailSent && (
            <>
              <button
                onClick={() => setTab("main")}
                className="text-[10px] font-bold tracking-[2px] uppercase text-[#99A1AF] hover:text-[#1a1a2e] mb-4 cursor-pointer"
              >
                ← GERİ
              </button>
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-2">Email ile Giriş</h2>
              <p className="text-xs text-[#717182] mb-6">Sana giriş linki göndereceğiz.</p>

              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A1AF]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@adresin.com"
                  className="w-full h-12 pl-10 pr-4 bg-[#F8F7F4] border border-[#E8E8EC] text-sm font-semibold text-[#1a1a2e] placeholder:text-[#C4C4CC] focus:outline-none focus:border-amber-400 transition-colors"
                  onKeyDown={e => e.key === "Enter" && handleMagicLink()}
                />
              </div>
              <button
                onClick={handleMagicLink}
                disabled={busy || !email}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm tracking-[2px] uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy ? "Gönderiliyor..." : "Giriş Linki Gönder"}
              </button>
            </>
          )}

          {emailSent && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-2">Email Gönderildi!</h2>
              <p className="text-sm text-[#717182] mb-1">
                <strong className="text-[#1a1a2e]">{email}</strong> adresine giriş linki gönderdik.
              </p>
              <p className="text-xs text-[#99A1AF]">Link 15 dakika geçerlidir.</p>
              <button
                onClick={() => { setEmailSent(false); setTab("main"); }}
                className="mt-6 text-xs font-bold tracking-[2px] uppercase text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                Geri Dön
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-[#C4C4CC] mt-6 tracking-wider">
          Giriş yaparak Kullanım Koşullarını kabul etmiş olursun.
        </p>
      </div>
    </div>
  );
}
