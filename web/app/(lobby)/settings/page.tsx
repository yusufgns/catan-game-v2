"use client";

import { useState } from "react";
import { Volume2, Monitor, Gamepad2, Shield, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SettingsCategory = "audio" | "video" | "gameplay" | "privacy" | "account";

const TABS: { key: SettingsCategory; label: string; icon: typeof Volume2 }[] = [
  { key: "audio", label: "Audio", icon: Volume2 },
  { key: "video", label: "Video", icon: Monitor },
  { key: "gameplay", label: "Gameplay", icon: Gamepad2 },
  { key: "privacy", label: "Privacy", icon: Shield },
  { key: "account", label: "Account", icon: User },
];

// ─── Slider Component ────────────────────────────────────────────────────────

function SettingsSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black uppercase tracking-wide text-[#1a1a2e]">{label}</span>
        <span className="text-sm font-bold text-amber-600">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#E8E8EC] accent-amber-500"
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsCategory>("audio");

  const [masterVol, setMasterVol] = useState(80);
  const [musicVol, setMusicVol] = useState(60);
  const [sfxVol, setSfxVol] = useState(70);
  const [voiceVol, setVoiceVol] = useState(50);

  return (
    <main className="flex-1 overflow-y-auto">
      {/* ─── Header + Tabs ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#F8F7F4] border-b border-[#E8E8EC] px-6 pt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black tracking-[3px] uppercase text-[#1a1a2e]">Settings</h1>
            <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">Configure Your Experience</p>
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

      {/* ─── Content ───────────────────────────────────────────────── */}
      <div className="px-6 py-6">
        {activeTab === "audio" && (
          <div className="bg-white rounded-2xl border border-dashed border-[#E8E8EC] p-8 space-y-8">
            <SettingsSlider label="Master Volume" value={masterVol} onChange={setMasterVol} />
            <SettingsSlider label="Music Volume" value={musicVol} onChange={setMusicVol} />
            <SettingsSlider label="Sound Effects" value={sfxVol} onChange={setSfxVol} />
            <SettingsSlider label="Voice Chat" value={voiceVol} onChange={setVoiceVol} />
          </div>
        )}

        {activeTab !== "audio" && (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[#E8E8EC] bg-white">
            <div className="text-center">
              <p className="text-sm font-semibold text-[#99A1AF]">{TABS.find(t => t.key === activeTab)?.label}</p>
              <p className="text-xs text-[#C4C4CC] mt-1">Coming soon</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
