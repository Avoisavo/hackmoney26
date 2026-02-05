"use client";

import React, { useState, useEffect } from "react";
import { EventCard } from "./EventCard";
import { fetchTrendingEvents, detectMarketType, CategorizedEvents } from "@/lib/polymarket";
import { motion } from "framer-motion";

const PoliticsHero = () => (
  <div className="mx-8 mb-12 rounded-3xl overflow-hidden bg-black relative min-h-[400px] flex items-center justify-center border border-zinc-800 shadow-2xl">
    {/* Decorative Neon Glows */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00C896] to-transparent opacity-50" />
    <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#00C896]/10 rounded-full blur-[100px]" />
    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-red-500/10 rounded-full blur-[100px]" />

    {/* Left Side: Trump Slide-in */}
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute left-0 bottom-0 h-[110%] z-10"
    >
      <img
        src="/market/trump.png"
        alt="Trump"
        className="h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
      />
    </motion.div>

    {/* Center Content */}
    <div className="relative z-20 text-center space-y-8 flex flex-col items-center max-w-2xl px-4">
      <div className="space-y-2">
        <div className="text-[12px] font-black uppercase tracking-[0.5em] text-[#00C896]">Global Event</div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">
          Who will <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C896] to-white">Trump talk to?</span>
        </h1>
      </div>

      {/* Mock Chart Area */}
      <div className="w-full relative py-8">
        <div className="flex justify-between items-end mb-4 px-4">
          <div className="text-left">
            <div className="text-3xl font-black text-white">TRUMP <span className="text-[#00C896]">68%</span></div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Confidence Score</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">PUTIN <span className="text-red-500">32%</span></div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Market Resistance</div>
          </div>
        </div>

        <svg className="w-full h-24 stroke-[#00C896] fill-none stroke-2" viewBox="0 0 400 100">
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            d="M 0,80 Q 50,75 100,85 T 200,60 T 300,30 T 400,10"
          />
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 2, delay: 0.8 }}
            className="stroke-red-500"
            d="M 0,85 Q 50,88 100,82 T 200,88 T 300,92 T 400,95"
          />
        </svg>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-4 w-full">
        <button className="flex-1 bg-[#00C896] hover:bg-[#00e0a7] text-black font-black py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase text-sm">
          Signal TRUMP
        </button>
        <button className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-black py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase text-sm">
          Signal PUTIN
        </button>
      </div>
    </div>

    {/* Right Side: Putin Slide-in */}
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute right-0 bottom-0 h-[100%] z-10"
    >
      <img
        src="/market/putin.png"
        alt="Putin"
        className="h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,0,0,0.1)]"
      />
    </motion.div>
  </div>
);

export const EventGrid = () => {
  const [data, setData] = useState<CategorizedEvents>({
    politics: { active: [], resolved: [] },
    crypto: { active: [], resolved: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      console.log("EventGrid: Starting to load events...");
      try {
        const result = await fetchTrendingEvents();
        console.log("EventGrid: Data received:", result);
        setData(result);
      } catch (error) {
        console.error("EventGrid: Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-12">
        {[1, 2].map((section) => (
          <div key={section} className="space-y-6">
            <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[280px] rounded-xl bg-gray-50 border border-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const RenderSubsection = ({ title, events, category, status }: { title: string, events: any[], category: string, status: 'Active' | 'Resolved' }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-8 pt-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary border-l-2 border-accent-green pl-4">
          {title} ({status})
        </h3>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-8">
        {events.map((event) => (
          <EventCard
            key={event.id}
            title={event.title}
            category={category}
            marketType={detectMarketType(event)}
            status={status}
            image={event.image}
            volume={event.volume}
            outcomesCount={event.markets?.length || 0}
            slug={event.slug}
            isTrending={Number(event.volume) > 5000000}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="py-12 space-y-24">
      {/* Politics Section */}
      <section className="space-y-2">
        <PoliticsHero />
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Politics</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <RenderSubsection title="Current Affairs" events={data.politics.active} category="Politics" status="Active" />
      </section>

      {/* Crypto Section */}
      <section className="space-y-2">
        <div className="px-8 mb-8">
          <h2 className="text-xl font-black tracking-tighter text-black uppercase">Crypto / Digital Assets</h2>
          <div className="h-1 w-20 bg-black mt-2" />
        </div>
        <RenderSubsection title="Protocol Dynamics" events={data.crypto.active} category="Crypto" status="Active" />
      </section>
    </div>
  );
};
