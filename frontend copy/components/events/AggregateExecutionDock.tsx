"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Outcome {
  id: string;
  name: string;
  probability: number;
}

interface AggregateExecutionDockProps {
  outcomes: Outcome[];
  eventTitle: string;
}

export const AggregateExecutionDock = ({ outcomes, eventTitle }: AggregateExecutionDockProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleOutcome = (id: string) => {
    setSelectedIds((prev) => {
      // If already selected, remove it
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      // Max 2 for "Range" (2/3) or 1 for "Single"
      if (prev.length >= 2) {
        return [id]; // Reset to single if they try to pick a 3rd
      }
      return [...prev, id];
    });
  };

  const selectedOutcomes = outcomes.filter((o) => selectedIds.includes(o.id));
  const combinedProb = selectedOutcomes.reduce((acc, curr) => acc + curr.probability, 0);
  const avgPrice = combinedProb; // Rough estimate for now
  const estPayout = amount ? (parseFloat(amount) / (avgPrice / 100)).toFixed(2) : "0.00";
  const roi = avgPrice > 0 ? ((100 / avgPrice - 1) * 100).toFixed(1) : "0.0";

  const handleSubmit = () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 2500);
  };

  return (
    <div className="sticky top-24 w-full bg-white border border-border-default rounded-xl p-8 shadow-crisp space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-hero">
          Unified Prediction Interface
        </h3>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">
          Event: {eventTitle}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
            Select Outcome(s)
          </label>
          <span className="text-[9px] font-bold text-accent-green uppercase">
            {selectedIds.length === 2 ? "Range Mode (2/3)" : selectedIds.length === 1 ? "Atomic Mode" : "Select to Trade"}
          </span>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {outcomes.map((outcome) => {
            const isSelected = selectedIds.includes(outcome.id);
            return (
              <button
                key={outcome.id}
                onClick={() => toggleOutcome(outcome.id)}
                className={cn(
                  "p-4 border text-left transition-all relative overflow-hidden group",
                  isSelected 
                    ? "border-accent-green bg-accent-green/5 shadow-sm" 
                    : "border-border-default hover:border-gray-400 bg-white"
                )}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter",
                      isSelected ? "text-accent-green-deep" : "text-text-primary"
                    )}>
                      {outcome.name}
                    </span>
                    <span className="text-[9px] font-bold text-text-secondary uppercase">
                      Current: {outcome.probability}%
                    </span>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                    isSelected ? "bg-accent-green border-accent-green" : "border-gray-300"
                  )}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                {isSelected && (
                   <motion.div 
                     layoutId="glow"
                     className="absolute inset-0 bg-accent-green/10 opacity-20 pointer-events-none"
                   />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
            Capital Allocation
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
          <span className="text-text-secondary">Estimated Price</span>
          <span className="text-text-hero font-black">{avgPrice > 0 ? `${avgPrice.toFixed(1)} ¢` : '--'}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-text-secondary">Est. Return</span>
          <span className="text-accent-green-deep font-black">
            {selectedIds.length > 0 ? `$${estPayout}` : '--'}
          </span>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-text-secondary">Predicted ROI</span>
          <span className="text-accent-green-deep font-black">
            {selectedIds.length > 0 ? `+${roi}%` : '--'}
          </span>
        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || selectedIds.length === 0}
        className={cn(
          "w-full h-16 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden",
          selectedIds.length > 0 
            ? "bg-text-primary text-white hover:bg-black" 
            : "bg-gray-100 text-gray-400 cursor-not-allowed",
          isSubmitting && "opacity-90 scale-[0.98]"
        )}
      >
        <span className={cn(isSubmitting ? "opacity-0" : "opacity-100")}>Execute Bundle</span>
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
            <div className="w-4 h-4 mt-0.5 text-blue-500 rounded-full border border-blue-200 flex items-center justify-center text-[8px] font-black">i</div>
            <p className="text-[9px] text-[#475569] leading-relaxed font-medium">
               Execution routes through multiple liquidity protocols to find the best spread. 
               Bundle orders are atomic.
            </p>
         </div>
      </div>
    </div>
  );
};
