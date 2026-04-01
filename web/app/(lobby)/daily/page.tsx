"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Check, Lock, Coins, Gem, Package, Flame } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type RewardType = "coins" | "gems" | "epic-chest" | "legendary-chest";
type DayStatus = "claimed" | "current" | "locked";

interface DayReward {
  day: number;
  amount: number;
  type: RewardType;
  status: DayStatus;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const REWARDS: DayReward[] = [
  { day: 1,  amount: 100,  type: "coins",          status: "claimed" },
  { day: 2,  amount: 150,  type: "coins",          status: "claimed" },
  { day: 3,  amount: 10,   type: "gems",           status: "claimed" },
  { day: 4,  amount: 250,  type: "coins",          status: "claimed" },
  { day: 5,  amount: 25,   type: "gems",           status: "claimed" },
  { day: 6,  amount: 400,  type: "coins",          status: "current" },
  { day: 7,  amount: 1,    type: "epic-chest",     status: "locked" },
  { day: 8,  amount: 500,  type: "coins",          status: "locked" },
  { day: 9,  amount: 50,   type: "gems",           status: "locked" },
  { day: 10, amount: 750,  type: "coins",          status: "locked" },
  { day: 11, amount: 75,   type: "gems",           status: "locked" },
  { day: 12, amount: 1000, type: "coins",          status: "locked" },
  { day: 13, amount: 100,  type: "gems",           status: "locked" },
  { day: 14, amount: 1,    type: "legendary-chest", status: "locked" },
];

const TYPE_CONFIG: Record<RewardType, { label: string; color: string; icon: typeof Coins }> = {
  "coins":          { label: "Coins",          color: "#E3B448", icon: Coins },
  "gems":           { label: "Gems",           color: "#C850C0", icon: Gem },
  "epic-chest":     { label: "Epic Chest",     color: "#A04028", icon: Package },
  "legendary-chest":{ label: "Legendary Chest", color: "#FF6B35", icon: Flame },
};

const CURRENT_STREAK = 5;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DailyBonusPage() {
  const [rewards, setRewards] = useState(REWARDS);
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [claimedSnapshot, setClaimedSnapshot] = useState<{ amount: number; type: RewardType } | null>(null);
  const currentReward = rewards.find(r => r.status === "current");
  const currentConfig = currentReward ? TYPE_CONFIG[currentReward.type] : TYPE_CONFIG["coins"];
  const CurrentIcon = currentConfig.icon;

  const snapshotConfig = claimedSnapshot ? TYPE_CONFIG[claimedSnapshot.type] : null;
  const SnapshotIcon = snapshotConfig?.icon ?? Coins;

  function handleClaim() {
    if (!currentReward) return;
    setClaimedSnapshot({ amount: currentReward.amount, type: currentReward.type });
    setShowClaimAnimation(true);
    setTimeout(() => {
      setRewards(prev => prev.map(r =>
        r.day === currentReward.day ? { ...r, status: "claimed" as DayStatus } :
        r.day === currentReward.day + 1 ? { ...r, status: "current" as DayStatus } : r
      ));
    }, 1500);
    setTimeout(() => {
      setShowClaimAnimation(false);
      setClaimedSnapshot(null);
    }, 2300);
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ─── Claim Animation Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {showClaimAnimation && claimedSnapshot && snapshotConfig && (
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
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <SnapshotIcon className="w-24 h-24 mx-auto mb-6" style={{ color: snapshotConfig.color }} />
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white tracking-[0.2em] uppercase mb-2"
              >
                Reward Claimed!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl font-bold"
                style={{ color: snapshotConfig.color }}
              >
                +{claimedSnapshot.amount} {snapshotConfig.label}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Left: Today's Reward ────────────────────────────────────── */}
      <aside className="w-[300px] shrink-0 border-r border-[#E8E8EC] bg-white overflow-y-auto flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-[#E8E8EC]">
          <h2 className="text-sm font-black tracking-[2px] uppercase text-[#1a1a2e]">Today&apos;s Reward</h2>
          <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">
            {currentReward ? `Day ${currentReward.day} Bonus` : "All claimed!"}
          </p>
        </div>

        {currentReward && (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            {/* Reward display */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-full border-[3px] border-dashed absolute inset-0"
                style={{ borderColor: `${currentConfig.color}40` }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
              >
                <CurrentIcon className="w-16 h-16" style={{ color: currentConfig.color }} />
              </motion.div>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl font-black text-[#1a1a2e]">{currentReward.amount}</div>
              <div className="text-lg font-black tracking-[1.5px] uppercase mt-1" style={{ color: currentConfig.color }}>
                {currentConfig.label}
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={handleClaim}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-amber-400 bg-amber-400 text-sm font-bold tracking-[1.2px] uppercase text-white cursor-pointer hover:bg-amber-500 transition-colors"
            >
              <Gift className="w-5 h-5" />
              Claim Reward
            </button>
          </div>
        )}

        {!currentReward && (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <Check className="w-16 h-16 text-green-500 mb-4" />
            <div className="text-lg font-black text-[#1a1a2e] text-center">All Done!</div>
            <p className="text-xs text-[#99A1AF] text-center mt-1">Come back tomorrow</p>
          </div>
        )}

        {/* Streak Bonus */}
        <div className="p-5 border-t border-[#E8E8EC]">
          <span className="text-[10px] font-black tracking-[1px] uppercase text-[#99A1AF] block mb-3">Streak Bonus</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-[#717182]">7-Day Bonus</span>
              <span className="text-xs font-black text-[#A04028]">Epic Chest</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-[#717182]">14-Day Bonus</span>
              <span className="text-xs font-black text-[#FF6B35]">Legendary Chest</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Right: 14-Day Cycle Grid ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#F8F7F4] border-b border-[#E8E8EC] px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-[3px] uppercase text-[#1a1a2e]">14-Day Cycle</h1>
              <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">Login Daily to Maximize Rewards</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#E8E8EC] rounded-lg">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-[8px] font-bold tracking-wider uppercase text-[#99A1AF]">Current Streak</div>
                <div className="text-sm font-black text-[#1a1a2e]">{CURRENT_STREAK} Days</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-3">
            {rewards.map((reward, idx) => {
              const config = TYPE_CONFIG[reward.type];
              const Icon = config.icon;
              const isClaimed = reward.status === "claimed";
              const isCurrent = reward.status === "current";
              const isLocked = reward.status === "locked";

              return (
                <motion.div
                  key={reward.day}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04, type: "spring", stiffness: 300, damping: 20 }}
                  layout
                  className={`relative flex flex-col items-center p-4 rounded-lg border transition-colors ${
                    isCurrent
                      ? "bg-amber-50 border-2 border-amber-300 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/50 animate-[pulse-shadow_2s_ease-in-out_infinite]"
                      : isClaimed
                      ? "bg-green-50/50 border-green-300/50"
                      : "bg-white border-[#E8E8EC]"
                  } ${isLocked ? "opacity-50" : ""}`}
                >

                  {/* Day label */}
                  <span className="text-[9px] font-black tracking-[1px] uppercase text-[#99A1AF] mb-2">
                    Day {reward.day}
                  </span>

                  {/* Icon */}
                  <Icon className="w-6 h-6 mb-2" style={{ color: config.color }} />

                  {/* Amount */}
                  <span className="text-lg font-black text-[#1a1a2e]">{reward.amount}</span>
                  <span className="text-[8px] font-black tracking-[0.6px] uppercase mt-0.5" style={{ color: config.color }}>
                    {config.label}
                  </span>

                  {/* Claimed badge */}
                  <AnimatePresence>
                    {isClaimed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Locked overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#C4C4CC]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
