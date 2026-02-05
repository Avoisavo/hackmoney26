"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const GlobalHeader = () => {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
      {/* Top Row */}
      <div className="h-16 px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="text-[#00C896] font-bold text-3xl tracking-tight cursor-pointer">
            Helix
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            <span className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">MARKETS</span>
            <span className="text-[13px] font-bold text-[#FF4B4B] cursor-pointer hover:opacity-80 transition-opacity">LIVE</span>
            <span className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">SOCIAL</span>
          </nav>
        </div>

        {/* Right Side: Search and Auth */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <div className="relative w-full max-w-[440px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Trade on anything"
              className="w-full h-11 bg-gray-100 border-none rounded-full pl-12 pr-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#00C896] transition-all"
            />
          </div>

          <div className="ml-2">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="h-11 px-6 border-t border-gray-50 flex items-center gap-7 overflow-x-auto no-scrollbar">
        <CategoryItem label="Trending" />
        <CategoryItem label="Politics" active />
        <CategoryItem label="Sports" />
        <CategoryItem label="Culture" />
        <CategoryItem label="Crypto" />
        <CategoryItem label="Climate" />
        <CategoryItem label="Economics" />
        <CategoryItem label="Mentions" />
        <CategoryItem label="Companies" />
        <CategoryItem label="Financials" />
        <CategoryItem label="Tech & Science" />
      </div>
    </header>
  );
};

const CategoryItem = ({ label, active = false }: { label: string, active?: boolean }) => (
  <span className={cn(
    "text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors h-full flex items-center border-b-2 border-transparent",
    active ? "text-gray-900 font-bold border-gray-900" : "text-gray-500 hover:text-gray-900"
  )}>
    {label}
  </span>
);
