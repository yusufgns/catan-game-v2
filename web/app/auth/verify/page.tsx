"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Crown, Check, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function VerifyPageWrapper() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#F8F7F4]"><div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyPage />
    </Suspense>
  );
}

function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("Token bulunamadı"); return; }

    fetch(`${API_URL}/auth/verify?token=${token}`, {
      credentials: "include",
      redirect: "manual",
    })
      .then(res => {
        if (res.ok || res.status === 0 || res.type === "opaqueredirect") {
          setStatus("success");
          setTimeout(() => router.replace("/"), 1500);
        } else {
          setStatus("error");
          setError("Geçersiz veya süresi dolmuş link");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Bağlantı hatası");
      });
  }, [token, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F8F7F4]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[400px] mx-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <Crown className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="bg-white border border-[#E8E8EC] p-8 shadow-sm">
          {status === "loading" && (
            <>
              <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e]">Doğrulanıyor...</h2>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-2">Giriş Başarılı!</h2>
              <p className="text-sm text-[#717182]">Yönlendiriliyorsun...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-black tracking-[2px] uppercase text-[#1a1a2e] mb-2">Hata</h2>
              <p className="text-sm text-[#717182] mb-4">{error}</p>
              <button
                onClick={() => router.replace("/login")}
                className="text-xs font-bold tracking-[2px] uppercase text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                Giriş Sayfasına Dön
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
