"use client";

import dynamic from "next/dynamic";

const CatanView = dynamic(() => import("./CatanView"), { ssr: false });

export default function PlayPage() {
  return <CatanView />;
}
