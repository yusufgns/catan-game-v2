"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { NEWS_ITEMS, TABS, CATEGORY_LABELS } from "./data";
import type { NewsCategory } from "./data";

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsCategory>("all");

  const filtered = activeTab === "all" ? NEWS_ITEMS : NEWS_ITEMS.filter(n => n.category === activeTab);

  return (
      <main className="flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-[#F8F7F4] border-b border-[#E8E8EC] px-6 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black tracking-[3px] uppercase text-[#1a1a2e]">All News</h1>
              <p className="text-[9px] tracking-[1px] uppercase text-[#99A1AF] mt-0.5">Stay Informed</p>
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

        {/* News Items */}
        <div className="px-6 py-6 space-y-4">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={`/news/${item.slug}`} className="block">
                <div className="flex items-center gap-4 px-4 py-4 bg-white border border-[#E8E8EC] rounded-lg hover:shadow-md hover:border-[#D4D4D8] transition-all cursor-pointer group">
                  <div
                    className="w-14 h-14 shrink-0 flex items-center justify-center border rounded-md"
                    style={{ background: `${item.color}10`, borderColor: `${item.color}35` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[8px] font-black tracking-[1px] uppercase px-2 py-0.5"
                        style={{ color: item.color, background: `${item.color}13` }}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <div className="flex items-center gap-1 text-[#C4C4CC]">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-bold">{item.time}</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-black uppercase text-[#1a1a2e] truncate tracking-wide">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#717182] truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#C4C4CC] shrink-0 group-hover:text-[#717182] transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
  );
}
