"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/markets/Sidebar";
import { GlobalHeader } from "@/components/markets/GlobalHeader";
import { EventGrid } from "@/components/markets/EventGrid";

const LabLoader = () => (
    <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 border border-border-default border-t-accent-green animate-spin rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-text-primary">
          HX
        </div>
      </div>
    </div>
);

export default function MarketsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LabLoader />;

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="pl-[260px]">
        <GlobalHeader />
        
        <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <EventGrid />
          
          {/* Footer Attribution */}
          <div className="px-8 pb-12 pt-8">
            <p className="text-[10px] text-text-secondary font-medium italic opacity-50 border-t border-gray-100 pt-6">
              Helix Lab Protocol Node 842 / Verified Archive Structure. 
              Archive synchronized: {new Date().toLocaleDateString()}. 
              Latency: 42ms.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
