"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const CatanView = dynamic(() => import("./CatanView"), { ssr: false });

function PlayContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");

  return <CatanView gameId={gameId} />;
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold tracking-[2px] uppercase text-white/50">Loading game...</span>
        </div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
