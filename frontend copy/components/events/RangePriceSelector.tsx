"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PricePoint {
  price: number;
  probabilityAbove: number;
}

interface RangePriceSelectorProps {
  pricePoints: PricePoint[];
  onRangeChange: (min: number, max: number, combinedProb: number) => void;
}

export const RangePriceSelector = ({ pricePoints, onRangeChange }: RangePriceSelectorProps) => {
  const [range, setRange] = useState<[number, number]>([2.60, 2.80]);

  // Sort price points by price
  const sortedPoints = useMemo(() => [...pricePoints].sort((a, b) => a.price - b.price), [pricePoints]);

  const minPrice = sortedPoints[0].price;
  const maxPrice = sortedPoints[sortedPoints.length - 1].price;

  const calculateProb = (low: number, high: number) => {
    // Basic interpolation for demo purposes
    const getProbAt = (p: number) => {
      const index = sortedPoints.findIndex(pt => pt.price >= p);
      if (index === 0) return sortedPoints[0].probabilityAbove;
      if (index === -1) return sortedPoints[sortedPoints.length - 1].probabilityAbove;

      const p1 = sortedPoints[index - 1];
      const p2 = sortedPoints[index];
      const t = (p - p1.price) / (p2.price - p1.price);
      return p1.probabilityAbove + t * (p2.probabilityAbove - p1.probabilityAbove);
    };

    const probLow = getProbAt(low);
    const probHigh = getProbAt(high);
    // Probability of being in [low, high] is P(>low) - P(>high)
    return Math.max(0, probLow - probHigh);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, isMax: boolean) => {
    const val = parseFloat(e.target.value);
    const newRange: [number, number] = isMax ? [range[0], Math.max(range[0] + 0.01, val)] : [Math.min(range[1] - 0.01, val), range[1]];
    setRange(newRange);
    onRangeChange(newRange[0], newRange[1], calculateProb(newRange[0], newRange[1]));
  };

  const currentProb = calculateProb(range[0], range[1]);

  return (
    <div className="w-full bg-white border border-border-default rounded-xl p-8 shadow-sm space-y-8 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none" />

      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">
          Custom Range Architect
        </h3>
        <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest">
          XRP-AGG-V1
        </span>
      </div>

      <div className="space-y-12 py-4">
        <div className="relative h-2 bg-gray-100 rounded-full">
          {/* Range highlight */}
          <div
            className="absolute h-full bg-accent-green rounded-full opacity-30"
            style={{
              left: `${((range[0] - minPrice) / (maxPrice - minPrice)) * 100}%`,
              right: `${100 - ((range[1] - minPrice) / (maxPrice - minPrice)) * 100}%`
            }}
          />

          {/* Range handles */}
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step="0.01"
            value={range[0]}
            onChange={(e) => handleSliderChange(e, false)}
            className="absolute w-full -top-1 h-4 appearance-none bg-transparent cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent-green"
          />
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step="0.01"
            value={range[1]}
            onChange={(e) => handleSliderChange(e, true)}
            className="absolute w-full -top-1 h-4 appearance-none bg-transparent cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent-green"
          />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Floor Price</label>
            <div className="text-3xl font-black text-text-primary">
              ${range[0].toFixed(2)}
            </div>
          </div>
          <div className="space-y-2 text-right">
            <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Ceiling Price</label>
            <div className="text-3xl font-black text-text-primary">
              ${range[1].toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-canvas rounded-lg flex items-center justify-between border border-border-default/50">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Implied Probability</span>
          <span className="text-2xl font-black text-accent-green-deep">{(currentProb * 100).toFixed(1)}%</span>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">Range Width</span>
          <span className="text-2xl font-black text-text-primary">${(range[1] - range[0]).toFixed(2)}</span>
        </div>
      </div>

      <p className="text-[9px] font-medium text-text-secondary italic">
        Select a floating range to execute a multi-option bundle trade.
        Xiphias Lab aggregates the "Above" probabilities into a custom density window.
      </p>
    </div>
  );
};
