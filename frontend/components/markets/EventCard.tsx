"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp, Clock, Dna } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  title: string;
  category?: string;
  marketType: 'Event-based' | 'Range-based';
  image: string;
  volume: string;
  outcomesCount: number;
  slug: string;
  isTrending?: boolean;
}

export const EventCard = ({
  title,
  category,
  marketType,
  image,
  volume,
  outcomesCount,
  slug,
  isTrending
}: EventCardProps) => {
  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(volume || 0));

  return (
    <div className="card-hover-lift group bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full cursor-pointer">
      <Link href={`/markets/view/${slug}`} className="flex flex-col h-full">
        {/* Header (Identity) */}
        <div className="p-5 flex items-start gap-4">
          <div className="relative w-[48px] h-[48px] flex-shrink-0 group-hover:rotate-[15deg] transition-transform duration-500 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
             {image ? (
               <Image 
                 src={image} 
                 alt={title} 
                 fill 
                 className="object-cover"
                 unoptimized
               />
             ) : (
               <Dna className="text-gray-300" size={24} />
             )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-black leading-tight line-clamp-2 mb-2 group-hover:text-accent-green transition-colors">
              {title}
            </h3>
          <div className="flex flex-wrap gap-1.5">
            {category && (
              <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-text-secondary border border-gray-200 rounded uppercase tracking-widest">
                {category}
              </span>
            )}
            <span className="px-2 py-0.5 bg-white text-[9px] font-black text-accent-green border border-accent-green/30 rounded uppercase tracking-widest">
              {marketType}
            </span>
            <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-text-secondary border border-gray-200 rounded uppercase tracking-widest">
              {outcomesCount} Markets
            </span>
          </div>
        </div>
      </div>

      {/* Spacing (Replaces Waveform) */}
      <div className="flex-1 px-5 pt-2 pb-6">
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-black font-mono tracking-tighter text-black">
              {formattedVolume}
            </div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent-green animate-pulse" />
              Aggregate Volume
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-auto border-t border-gray-100 p-4 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2 text-text-secondary">
          <Clock size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Live Archive</span>
        </div>
        {isTrending && (
          <div className="flex items-center gap-1 text-accent-green">
            <TrendingUp size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Trending</span>
          </div>
        )}
      </div>
      </Link>
    </div>
  );
};
