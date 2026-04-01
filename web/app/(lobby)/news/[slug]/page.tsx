"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Calendar, Clock, User, Bookmark, Share2,
} from "lucide-react";
import { NEWS_ITEMS, CATEGORY_LABELS } from "../data";

export default function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const item = NEWS_ITEMS.find(n => n.slug === slug);
  if (!item) return notFound();

  const Icon = item.icon;
  const moreNews = NEWS_ITEMS.filter(n => n.slug !== slug).slice(0, 3);

  return (
    <main className="flex-1 overflow-y-auto">
      {/* ─── Top Bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E8EC] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/news"
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-[1.2px] uppercase text-[#717182] border border-[#E8E8EC] hover:bg-[#F8F7F4] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
          <span
            className="text-[9px] font-black tracking-[1px] uppercase px-3 py-1 border"
            style={{ color: item.color, background: `${item.color}13`, borderColor: `${item.color}25` }}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[1.2px] uppercase border-2 border-amber-400 bg-amber-400 text-white transition-colors hover:bg-amber-500 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[1.2px] uppercase border-2 border-amber-400 bg-amber-400 text-white transition-colors hover:bg-amber-500 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* ─── Article ───────────────────────────────────────────────────── */}
      <div className="px-10 py-8">

        {/* Header */}
        <div className="pb-6 mb-6 border-b border-[#E8E8EC]">
          <div className="flex items-center gap-5 mb-5">
            <div
              className="w-16 h-16 shrink-0 flex items-center justify-center border-2 rounded-md"
              style={{ background: `${item.color}10`, borderColor: item.color }}
            >
              <Icon className="w-8 h-8" style={{ color: item.color }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black uppercase text-[#1a1a2e] tracking-wide leading-tight">
                {item.title}
              </h1>
              <div className="flex items-center gap-5 mt-2">
                <div className="flex items-center gap-1.5 text-[#99A1AF]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{item.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#99A1AF]">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{item.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#99A1AF]" />
                  <span className="text-sm text-[#99A1AF]">By</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.author}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Body */}
        <div className="space-y-5 mb-8">
          {item.body.map((paragraph, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-[#444]">
              {paragraph}
            </p>
          ))}
        </div>

        {/* More News */}
        <div className="border-t border-[#E8E8EC] pt-8 mt-4">
          <h3 className="text-xs font-black tracking-[1.2px] uppercase text-[#99A1AF] mb-4">
            More News
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {moreNews.map((news) => (
              <Link key={news.id} href={`/news/${news.slug}`}>
                <div className="flex flex-col justify-between h-[130px] p-5 bg-white border border-[#E8E8EC] rounded-lg hover:shadow-md hover:border-[#D4D4D8] transition-all cursor-pointer">
                  <div>
                    <span
                      className="text-[8px] font-black tracking-[1px] uppercase px-2 py-0.5 inline-block mb-3"
                      style={{ color: news.color, background: `${news.color}13` }}
                    >
                      {CATEGORY_LABELS[news.category]}
                    </span>
                    <h4 className="text-xs font-black uppercase text-[#1a1a2e] leading-tight">
                      {news.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-[#99A1AF]">{news.time}</span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </main>
  );
}
