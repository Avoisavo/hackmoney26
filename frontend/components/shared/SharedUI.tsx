"use client";

import React from "react";
import { Dna, LayoutGrid } from "lucide-react";
import Link from "next/link";

export const LabHeader = () => (
  <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 z-[100] flex items-center justify-between px-8">
    <Link href="/markets" className="flex items-center gap-2 text-black font-black tracking-tighter text-xl hover:opacity-80 transition-opacity">
      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
        <Dna className="text-accent-green" size={20} />
      </div>
      HELIX
    </Link>

    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">System Online</span>
      </div>
      <div className="h-4 w-px bg-gray-100" />
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
        <LayoutGrid size={14} />
        Archive v2.0.4
      </div>
    </div>
  </header>
);

export const InsightsTicker = () => {
  const insights = [
    "Iran War: US strike probability hits 72%, volume up 400% in 24h.",
    "ETH ETF: Dec 15 deadline approached, SEC tone shifting.",
    "Global: Prediction volumes reach all-time high on Helix Labs.",
    "System: Node 842 synchronized with Ethereum Mainnet.",
    "Market Flow: Large whale accumulation detected on YES outcomes.",
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-black border-t border-gray-800 z-50 flex items-center overflow-hidden">
      <div className="flex items-center gap-8 animate-ticker whitespace-nowrap px-8">
        {[...insights, ...insights].map((text, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <span className="text-[10px] font-black text-accent-green uppercase tracking-widest">Helix Insight</span>
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-tighter">
              {text}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
};
