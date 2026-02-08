"use client";

import React from "react";
import {
  Compass,
  ChevronRight,
  Activity,
  Dna
} from "lucide-react";
import { cn } from "@/lib/utils";

const NavItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <button className={cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs font-bold",
    active
      ? "bg-white text-accent-green shadow-sm ring-1 ring-black/5"
      : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
  )}>
    <Icon size={16} />
    {label}
  </button>
);

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-3">
      {title}
    </h3>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const TopicItem = ({ label }: { label: string }) => (
  <button className="w-full flex items-center justify-between px-3 py-1.5 group text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors">
    {label}
    <ChevronRight size={14} className="text-gray-300 group-hover:text-accent-green transition-colors" />
  </button>
);

export const Sidebar = () => {
  return (
    <aside className="w-[260px] fixed left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 pb-8">
        <div className="flex items-center gap-2 text-black font-black tracking-tighter text-xl">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <Dna className="text-accent-green" size={20} />
          </div>
          XIPHIAS
        </div>
      </div>

      {/* Primary Nav */}
      <div className="px-3 space-y-1 mb-10">
        <NavItem icon={Compass} label="Discover" active />
      </div>

      {/* Filters & Taxonomy */}
      <div className="flex-1 overflow-y-auto px-3 space-y-8 pb-32">
        <FilterSection title="Sectors">
          <TopicItem label="Politics" />
          <TopicItem label="Crypto Assets" />
        </FilterSection>
      </div>

      {/* Live Stats (Pinned) */}
      <div className="mt-auto p-4 bg-gray-50 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_#10B981]" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">Global Vol</span>
          </div>
          <span className="text-[11px] font-mono font-bold">$42.8M</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-text-secondary" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">Active Events</span>
          </div>
          <span className="text-[11px] font-mono font-bold">1,842</span>
        </div>
      </div>
    </aside>
  );
};
