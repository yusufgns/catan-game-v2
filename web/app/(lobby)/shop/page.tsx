"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gem, Sparkles, X, AlertCircle, CreditCard, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = "coins" | "avatars" | "colors" | "assets" | "maps";

interface CoinPackage {
  id: string;
  amount: number;
  bonus: number;
  price: number;
  popular?: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TABS: { key: Category; label: string }[] = [
  { key: "coins", label: "Coin Packages" },
  { key: "avatars", label: "Avatars" },
  { key: "colors", label: "Player Colors" },
  { key: "assets", label: "Game Assets" },
  { key: "maps", label: "Maps" },
];

const COIN_PACKAGES: CoinPackage[] = [
  { id: "cp1", amount: 500, bonus: 0, price: 5 },
  { id: "cp2", amount: 1100, bonus: 100, price: 10 },
  { id: "cp3", amount: 1800, bonus: 300, price: 15, popular: true },
  { id: "cp4", amount: 2500, bonus: 500, price: 20 },
  { id: "cp5", amount: 6500, bonus: 1500, price: 50, popular: true },
  { id: "cp6", amount: 15000, bonus: 5000, price: 100 },
];

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Purchase Dialog ─────────────────────────────────────────────────────────

function PurchaseDialog({
  pkg,
  onClose,
  onConfirm,
}: {
  pkg: CoinPackage;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const total = pkg.amount + pkg.bonus;
  const details = [
    `${formatNumber(pkg.amount)} Base Coins`,
    ...(pkg.bonus > 0 ? [`+${formatNumber(pkg.bonus)} Bonus Coins`] : []),
    `Total: ${formatNumber(total)} Coins`,
    "Instant delivery",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="w-[440px] bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-amber-50 border-2 border-amber-300 flex items-center justify-center">
                <Coins className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <span className="text-[8px] font-black tracking-[1px] uppercase px-2 py-0.5 bg-amber-100 text-amber-600 inline-block mb-1">
                  COINS
                </span>
                <h2 className="text-lg font-black uppercase text-[#1a1a2e] tracking-wide">
                  {formatNumber(pkg.amount)} Coins Package
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F7F4] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#99A1AF]" />
            </button>
          </div>

          <p className="text-sm text-[#717182] mb-4">
            Purchase {formatNumber(pkg.amount)} coins for your account.
            {pkg.bonus > 0 && ` Includes ${formatNumber(pkg.bonus)} bonus coins!`}
          </p>

          {/* Includes */}
          <div className="bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg p-4 mb-4">
            <span className="text-[10px] font-black tracking-[1px] uppercase text-[#99A1AF] block mb-2">Includes:</span>
            <ul className="space-y-1.5">
              {details.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-[#717182]">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-sm font-black uppercase tracking-wide text-[#1a1a2e]">Total Price:</span>
            <span className="text-3xl font-black text-amber-600">${pkg.price}</span>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-700">
              This is a real money transaction. Please confirm your purchase.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold tracking-[1px] uppercase text-[#717182] bg-white border-2 border-[#E8E8EC] cursor-pointer hover:bg-[#F3F3F6] transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-amber-400 bg-amber-400 text-xs font-bold tracking-[1px] uppercase text-white cursor-pointer hover:bg-amber-500 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Confirm Purchase
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Success Animation ───────────────────────────────────────────────────────

function PurchaseSuccess({
  pkg,
  onComplete,
}: {
  pkg: CoinPackage;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <Coins className="w-24 h-24 mx-auto mb-6 text-amber-500" />
        </motion.div>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-black text-white tracking-[0.2em] uppercase mb-2"
        >
          Purchase Complete!
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl font-bold text-amber-400"
        >
          +{formatNumber(pkg.amount + pkg.bonus)} Coins
        </motion.p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className="mt-4 w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto"
        >
          <Check className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<Category>("coins");
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [successPkg, setSuccessPkg] = useState<CoinPackage | null>(null);

  function handleConfirm() {
    if (!selectedPkg) return;
    const pkg = selectedPkg;
    setSelectedPkg(null);
    setSuccessPkg(pkg);
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">SHOP</h1>
        <p className="mt-1 text-sm text-[#99A1AF]">
          Purchase coins & unlock premium content
        </p>
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

      {/* ── Content ────────────────────────────────────────────────────── */}
      {activeTab === "coins" && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COIN_PACKAGES.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative flex flex-col items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center transition-all hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 hover:scale-[1.02] cursor-pointer"
              onClick={() => setSelectedPkg(pkg)}
            >
              {pkg.popular && (
                <span
                  className="absolute -top-3 right-4 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: "#FF6B35" }}
                >
                  Popular
                </span>
              )}

                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
                <Gem size={28} className="text-amber-500" />
              </div>

              <p className="text-3xl font-extrabold text-[#1a1a2e]">
                {formatNumber(pkg.amount)}
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#99A1AF]">
                Coins
              </p>

              {pkg.bonus > 0 && (
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold" style={{ color: "#05DF72" }}>
                  <Sparkles size={14} />
                  +{formatNumber(pkg.bonus)} bonus
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                className="mt-6 w-full rounded-xl border-2 border-amber-400 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 transition-all hover:bg-amber-400 hover:text-white cursor-pointer"
              >
                ${pkg.price}
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
      {activeTab !== "coins" && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[#E8E8EC] bg-white">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#99A1AF]">{TABS.find(t => t.key === activeTab)?.label}</p>
            <p className="text-xs text-[#C4C4CC] mt-1">Coming soon</p>
          </div>
        </div>
      )}

      {/* ── Purchase Dialog ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPkg && (
          <PurchaseDialog
            pkg={selectedPkg}
            onClose={() => setSelectedPkg(null)}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>

      {/* ── Success Animation ──────────────────────────────────────────── */}
      <AnimatePresence>
        {successPkg && (
          <PurchaseSuccess
            pkg={successPkg}
            onComplete={() => setSuccessPkg(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
