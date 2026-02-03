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
