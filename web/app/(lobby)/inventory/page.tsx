"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Rarity = "epic" | "rare" | "common" | "legendary";
type ItemCategory = "all" | "avatars" | "borders" | "emotes" | "effects";
type ItemStatus = "equipped" | "available" | "locked";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: Rarity;
  status: ItemStatus;
  category: ItemCategory;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; border: string; badge: string }> = {
  epic:      { label: "Epic",      color: "#A04028", border: "border-l-rose-600",    badge: "bg-rose-600" },
  rare:      { label: "Rare",      color: "#2A4A7F", border: "border-l-blue-600",    badge: "bg-blue-600" },
  common:    { label: "Common",    color: "#8B949E", border: "border-l-gray-400",    badge: "bg-gray-400" },
  legendary: { label: "Legendary", color: "#FFD700", border: "border-l-amber-500",   badge: "bg-amber-500" },
};

const TABS: { key: ItemCategory; label: string }[] = [
  { key: "all",     label: "All Items" },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_ITEMS: InventoryItem[] = [];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<ItemCategory>("all");
  const [items, setItems] = useState<InventoryItem[]>(MOCK_ITEMS);

  const filteredItems = activeTab === "all" ? items : items.filter((i) => i.category === activeTab);
  const totalCount = items.length;
  const equippedCount = items.filter((i) => i.status === "equipped").length;

  function handleEquip(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id && item.status === "available" ? { ...item, status: "equipped" as ItemStatus } : item))
    );
  }

  function handleUnequip(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id && item.status === "equipped" ? { ...item, status: "available" as ItemStatus } : item))
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">INVENTORY</h1>
          <p className="mt-1 text-sm text-[#99A1AF]">
            Manage your collection &bull; Equip items to customize your profile
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[#99A1AF]">
            Total: <span className="text-[#1a1a2e] font-bold">{totalCount}</span>
          </span>
          <span className="text-sm font-medium text-amber-600">
            Equipped: <span className="font-bold">{equippedCount}</span>
          </span>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <nav className="flex gap-1 mb-8 border-b border-[#E8E8EC]">
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

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[#E8E8EC] bg-white">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#99A1AF]">Inventory</p>
            <p className="text-xs text-[#C4C4CC] mt-1">Coming soon</p>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Card Component ──────────────────────────────────────────────────────────

function InventoryCard({
  item,
  onEquip,
  onUnequip,
}: {
  item: InventoryItem;
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
}) {
  const cfg = RARITY_CONFIG[item.rarity];
  const isLocked = item.status === "locked";
  const isEquipped = item.status === "equipped";

  return (
    <div
      className={`relative rounded-2xl border border-gray-200 bg-white border-l-4 ${cfg.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isLocked ? "opacity-60" : ""
      }`}
    >
      {isEquipped && (
        <div className="absolute top-3 left-5 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow">
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      <div className="absolute top-3 right-3 z-10">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100/50 backdrop-blur-[1px]">
          <Lock size={32} className="text-gray-400" />
        </div>
      )}

      <div className="flex items-center justify-center h-32 text-5xl select-none">
        {item.emoji}
      </div>

      <div className="px-4 pb-4">
        <h3 className="text-sm font-bold text-[#1a1a2e] truncate">{item.name}</h3>
        <p className="text-xs text-[#99A1AF] mt-0.5 truncate">{item.description}</p>

        <div className="mt-3">
          {isLocked ? (
            <button
              disabled
              className="w-full py-2 rounded-lg text-xs font-bold text-gray-400 bg-gray-100 cursor-not-allowed"
            >
              LOCKED
            </button>
          ) : isEquipped ? (
            <button
              onClick={() => onUnequip(item.id)}
              className="w-full py-2 rounded-lg text-xs font-bold text-white transition-colors"
              style={{ backgroundColor: cfg.color }}
            >
              Equipped ✓
            </button>
          ) : (
            <button
              onClick={() => onEquip(item.id)}
              className="w-full py-2 rounded-lg text-xs font-bold border transition-colors hover:text-white"
              style={{ color: cfg.color, borderColor: cfg.color }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = cfg.color;
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = cfg.color;
              }}
            >
              Equip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
