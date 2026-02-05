"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RangeExecutionDockProps {
  eventTitle: string;
  minPrice: number;
  maxPrice: number;
  probability: number;
}

export const RangeExecutionDock = ({ eventTitle, minPrice, maxPrice, probability }: RangeExecutionDockProps) => {
  const [amount, setAmount] = useState<string>("500");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avgPrice = probability * 100;
  const estPayout = amount ? (parseFloat(amount) / probability).toFixed(2) : "0.00";
  const roi = probability > 0 ? ((1 / probability - 1) * 100).toFixed(1) : "0.0";

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 2500);
  };

  return (
    <div className="sticky top-24 w-full bg-white border border-border-default rounded-xl p-8 shadow-crisp space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-hero">
          Range Execution Dock
        </h3>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">
          Event: {eventTitle}
        </p>
      </div>

      <div className="p-6 bg-canvas border border-border-default rounded-lg space-y-4">
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Target Window</span>
            <span className="text-xs font-black text-text-primary uppercase tracking-tighter">
                ${minPrice.toFixed(2)} — ${maxPrice.toFixed(2)}
            </span>
        </div>
        <div className="h-px bg-gray-200" />
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Aggregate Cost</span>
            <span className="text-sm font-black text-accent-green-deep">
                {avgPrice.toFixed(1)}¢
            </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
            Order Size
          </label>
          <span className="text-[9px] font-bold text-text-secondary">Balance: 12,402.00 USDC</span>
        </div>
        <div className="relative group">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-canvas border border-border-default h-16 px-6 pt-2 text-2xl font-black text-text-hero focus:outline-none focus:border-accent-green transition-colors" 
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-[#94A3B8]">USDC</span>
        </div>
      </div>

      <div className="p-6 bg-canvas space-y-3 rounded-lg border border-border-default/50">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-text-secondary">Est. Exposure</span>
          <span className="text-text-hero font-black text-accent-green-deep">${estPayout}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-text-secondary">Implied ROI</span>
          <span className="text-accent-green-deep font-black">+{roi}%</span>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={cn(
          "w-full h-16 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden bg-black text-white hover:bg-zinc-800",
          isSubmitting && "opacity-90 scale-[0.98]"
        )}
      >
        <span className={cn(isSubmitting ? "opacity-0" : "opacity-100")}>Execute Custom Range</span>
        {isSubmitting && (
          <motion.div 
            initial={{ x: "-100%" }} 
            animate={{ x: "100%" }} 
            transition={{ duration: 1.5, repeat: Infinity }} 
            className="absolute top-0 bottom-0 left-0 w-1/3 bg-white/20 skew-x-12" 
          />
        )}
      </button>

      <div className="pt-2">
         <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100/50 rounded-lg">
            <div className="w-4 h-4 mt-0.5 text-blue-500 rounded-full border border-blue-200 flex items-center justify-center text-[8px] font-black">!</div>
            <p className="text-[9px] text-[#475569] leading-relaxed font-medium">
               This order will be decomposed into multiple sub-market positions to guarantee your selected price window coverage.
            </p>
         </div>
      </div>
    </div>
  );
};
