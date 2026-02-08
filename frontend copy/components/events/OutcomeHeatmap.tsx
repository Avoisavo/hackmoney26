"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OutcomeHeatmapProps {
  outcomes: {
    name: string;
    probability: number;
    color: string;
    image?: string;
  }[];
}

export const OutcomeHeatmap = ({ outcomes }: OutcomeHeatmapProps) => {
  // Normalize probabilities to ensure they sum to 100% for the visualization
  const total = outcomes.reduce((acc, curr) => acc + curr.probability, 0);

  return (
    <div className="w-full space-y-8 bg-white border border-border-default rounded-xl p-8 shadow-sm overflow-hidden relative group">
      <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">
          Sentiment Distribution / Heatmap
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-[10px] font-bold uppercase text-accent-green">Live Feed</span>
        </div>
      </div>

      <div className="relative h-24 w-full flex rounded-lg overflow-hidden border border-border-default shadow-inner bg-canvas">
        {outcomes.map((outcome, i) => (
          <motion.div
            key={outcome.name}
            initial={{ width: 0 }}
            animate={{ width: `${(outcome.probability / (total || 1)) * 100}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="relative h-full transition-all group/cell"
            style={{ backgroundColor: outcome.color }}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 overflow-hidden">
              <span className="text-[10px] font-black uppercase text-white drop-shadow-md truncate w-full text-center">
                {outcome.name}
              </span>
              <span className="text-sm font-black text-white drop-shadow-md">
                {outcome.probability}%
              </span>
            </div>
            {/* Heat glow effect */}
            <div
              className="absolute inset-0 opacity-20 blur-xl pointer-events-none"
              style={{ backgroundColor: outcome.color }}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 pt-4">
        {outcomes.map((outcome) => (
          <div key={outcome.name} className="space-y-2 border-l-2 pl-4" style={{ borderColor: outcome.color }}>
            <div className="flex items-center gap-2">
              {outcome.image && (
                <div className="relative w-4 h-4 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                  <img src={outcome.image} alt={outcome.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-[9px] font-black uppercase tracking-widest text-text-secondary truncate">
                {outcome.name}
              </div>
            </div>
            <div className="text-xl font-black text-text-primary">
              {outcome.probability}%
            </div>
            <div className="h-1 w-full bg-canvas rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{ backgroundColor: outcome.color }}
                initial={{ width: 0 }}
                animate={{ width: `${outcome.probability}%` }}
                transition={{ duration: 2, delay: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <p className="text-[9px] font-medium text-text-secondary italic">
          Visualizing aggregated sentiment across 30+ secondary market venues.
          Probabilities are weight-adjusted by liquidity and order depth.
        </p>
      </div>
    </div>
  );
};
