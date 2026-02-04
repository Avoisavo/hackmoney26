"use client";

import React from "react";
import { Search, ChevronDown, Wallet } from "lucide-react";

export const GlobalHeader = () => {
  return (
    <header className="h-16 sticky top-0 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search events, tags, or tickers..."
          className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green/30 focus:border-accent-green transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 border border-gray-200 bg-white rounded text-[10px] font-bold text-gray-400">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Sort by:</span>
          <span className="text-[11px] font-black text-text-primary uppercase tracking-wider">Volume (High to Low)</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-zinc-800 transition-all">
          <Wallet size={14} />
          Connect Wallet
        </button>
      </div>
    </header>
  );
};
