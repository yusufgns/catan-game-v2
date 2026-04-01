"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, UserPlus } from "lucide-react";

interface OnlineFriend {
  id: string;
  name: string;
  invited: boolean;
}

const ONLINE_FRIENDS: OnlineFriend[] = [
  { id: "1", name: "Player_Zero", invited: false },
  { id: "2", name: "Neon_Viper", invited: false },
  { id: "3", name: "Catan_King", invited: false },
  { id: "4", name: "Mars_Lander", invited: false },
];

export function InviteFriendsDialog({
  isOpen,
  onClose,
  onInvite,
  hasEmptySlot = true,
  lobbyCode = "CXT-9921",
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (name: string) => void;
  hasEmptySlot?: boolean;
  lobbyCode?: string;
}) {
  const [friends, setFriends] = useState(ONLINE_FRIENDS);
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(`catan.gg/${lobbyCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInvite(id: string) {
    if (!hasEmptySlot) return;
    const friend = friends.find(f => f.id === id);
    setFriends(prev => prev.map(f => f.id === id ? { ...f, invited: true } : f));
    if (friend && onInvite) {
      setTimeout(() => onInvite(friend.name), 500 + Math.random() * 1000);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-[520px] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#E8E8EC]">
              <div>
                <h2 className="text-lg font-black tracking-[3px] uppercase text-[#1a1a2e]">Invite Players</h2>
                <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">Share with friends</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F7F4] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-[#99A1AF]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lobby Link */}
              <div className="flex items-center justify-between p-4 bg-[#F8F7F4] border border-[#E8E8EC] rounded-lg">
                <div>
                  <span className="text-[9px] font-bold tracking-[1px] uppercase text-[#99A1AF] block mb-0.5">
                    Lobby Invitation Link
                  </span>
                  <span className="text-base font-black tracking-[1px] uppercase text-[#1a1a2e]">
                    CATAN.GG/{lobbyCode}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg text-xs font-bold tracking-[1px] uppercase bg-white border-2 border-[#E8E8EC] text-[#717182] cursor-pointer flex items-center gap-1.5 hover:bg-[#F3F3F6] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Online Friends */}
              <div>
                <span className="text-[10px] font-black tracking-[2px] uppercase text-[#99A1AF] block mb-3">
                  Online Friends
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => !friend.invited && handleInvite(friend.id)}
                      title={!friend.invited && !hasEmptySlot ? "Lobby is full, no empty slots available" : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                        friend.invited
                          ? "bg-green-50 border-green-200"
                          : !hasEmptySlot
                          ? "bg-[#F8F7F4] border-[#E8E8EC] opacity-50 cursor-not-allowed"
                          : "bg-[#F8F7F4] border-[#E8E8EC] hover:bg-[#EFEEEB] cursor-pointer"
                      }`}
                    >
                      <span className={`text-xs font-bold uppercase ${friend.invited ? "text-green-600" : "text-[#717182]"}`}>
                        {friend.name}
                      </span>
                      {friend.invited ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 text-[#99A1AF]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
