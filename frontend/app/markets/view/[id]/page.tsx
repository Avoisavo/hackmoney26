"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ExternalLink, Activity, DollarSign, Users } from "lucide-react";
import { LabHeader } from "@/components/markets/SharedUI";
import { fetchEventBySlug, PolymarketEvent, detectMarketType } from "@/lib/polymarket";
import { cn } from "@/lib/utils";

const MarketRow = ({ market }: { market: any }) => {
  let outcomes: string[] = [];
  let prices: string[] = [];
  
  try {
    outcomes = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes;
    prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
  } catch (e) {}

  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-6 hover:border-accent-green hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-bold text-black leading-tight group-hover:text-accent-green-deep transition-colors">
          {market.question}
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <Activity size={12} className="text-accent-green" />
            Vol: ${Number(market.volume || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={12} />
            Liq: ${Number(market.liquidity || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:w-[320px] justify-end">
        {outcomes?.slice(0, 2).map((outcome, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg min-w-[140px]">
            <span className="text-[10px] font-black uppercase text-text-secondary truncate max-w-[80px]">{outcome}</span>
            <span className="text-sm font-black text-accent-green">
              {prices[idx] ? `${Math.round(parseFloat(prices[idx]) * 100)}¢` : '--'}
            </span>
          </div>
        ))}
        <a 
          href={`https://polymarket.com/market/${market.slug}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2.5 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<PolymarketEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      try {
        const data = await fetchEventBySlug(id as string);
        setEvent(data);
      } catch (error) {
        console.error("Failed to load event details:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <LabHeader />
        <div className="max-w-5xl mx-auto pt-32 px-8 space-y-12">
           <div className="animate-pulse space-y-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-xl w-3/4" />
              <div className="h-64 bg-gray-50 rounded-2xl" />
           </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-black gap-2 flex items-center mb-4">
          <Activity className="text-accent-green" />
          Event Not Found
        </h1>
        <button 
          onClick={() => router.push('/markets')}
          className="px-6 py-2 bg-black text-white text-xs font-black uppercase tracking-widest rounded"
        >
          Return to Archive
        </button>
      </div>
    );
  }

  const marketType = detectMarketType(event);

  return (
    <main className="min-h-screen bg-white pb-32">
      <LabHeader />

      <div className="max-w-5xl mx-auto pt-32 px-8">
        {/* Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-black transition-colors mb-12"
        >
          <ChevronLeft size={16} />
          Back to Archive
        </button>

        {/* Event Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
          <div className="relative w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <Image 
              src={event.image} 
              alt={event.title} 
              fill 
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-white text-[9px] font-black text-accent-green border border-accent-green/30 rounded uppercase tracking-widest">
                {marketType}
              </span>
              <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-text-secondary border border-gray-200 rounded uppercase tracking-widest">
                {event.markets?.length} Secondary Markets
              </span>
            </div>
            <h1 className="text-4xl font-black text-black tracking-tighter leading-tight">
              {event.title}
            </h1>
            <p className="text-sm font-medium text-text-secondary leading-relaxed max-w-2xl">
              {event.description}
            </p>
          </div>
        </div>

        {/* Global Event Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2">
            <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Total Event Volume</div>
            <div className="text-3xl font-black text-black">
              ${Number(event.volume || 0).toLocaleString()}
            </div>
          </div>
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2">
            <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Resolution Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <div className="text-lg font-bold text-black uppercase tracking-tight">Active Archive</div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2">
             <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">External Link</div>
             <a 
               href={`https://polymarket.com/event/${event.slug}`} 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-lg font-bold text-accent-green-deep hover:underline"
             >
               View on Polymarket
               <ExternalLink size={14} />
             </a>
          </div>
        </div>

        {/* Markets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-6">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-black border-l-2 border-accent-green pl-4">
              Archive Markets Flow
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {event.markets?.map((market) => (
              <MarketRow key={market.id} market={market} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
