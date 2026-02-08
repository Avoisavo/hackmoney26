"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, RefreshCw, LayoutGrid } from "lucide-react";

export const MockOrderBook = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState("Order Book");

    // Generate mock data for 0 to 100 cents
    const lastPrice = 0.8;
    const spread = 0.2;

    // Sort logic: Asks (red) descending from 100 down to spread+lastPrice, 
    // Bids (green) descending from lastPrice down to 0.
    const asks = Array.from({ length: 10 }, (_, i) => {
        const p = 1.2 - (i * 0.1);
        return {
            price: p.toFixed(1),
            shares: (Math.random() * 20000 + 1000).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            total: (Math.random() * 500 + 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' }),
            depth: Math.random() * 100
        };
    }).filter(a => parseFloat(a.price) > lastPrice);

    const bids = Array.from({ length: 10 }, (_, i) => {
        const p = 0.7 - (i * 0.1);
        return {
            price: p.toFixed(1),
            shares: (Math.random() * 150000 + 10000).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            total: (Math.random() * 2000 + 200).toLocaleString(undefined, { style: 'currency', currency: 'USD' }),
            depth: Math.random() * 100
        };
    }).filter(b => parseFloat(b.price) >= 0);

    return (
        <div className="w-full bg-[#1A232E] border border-[#2D3748] rounded-lg overflow-hidden shadow-2xl mt-8 font-sans text-gray-300">
            {/* Tabbed Header */}
            <div className="flex items-center justify-between px-4 border-b border-[#2D3748] bg-[#111827]">
                <div className="flex gap-6 h-12">
                    {["Order Book", "Graph", "Resolution"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest relative px-1 flex items-center transition-colors",
                                activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6]" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <RefreshCw className="w-4 h-4 text-gray-500 cursor-pointer hover:rotate-180 transition-transform duration-500" />
                    <div className="bg-[#2D3748] px-2 py-1 rounded text-[10px] font-black tracking-tighter cursor-pointer hover:bg-gray-600 transition-colors">0.1¢</div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                    >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Sub-header Controls */}
                    <div className="flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8] border-b border-[#2D3748]">
                        <div className="flex items-center gap-2">
                            <span>Trade Yes</span>
                            <LayoutGrid className="w-3 h-3 text-[#3B82F6]" />
                        </div>
                        <div className="flex-1 grid grid-cols-3 text-right pr-4">
                            <span>Price</span>
                            <span>Shares</span>
                            <span>Total</span>
                        </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto no-scrollbar font-mono">
                        {/* Asks Section */}
                        <div className="relative">
                            <div className="absolute top-2 left-4 px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black rounded border border-rose-500/20 uppercase tracking-widest z-10">Asks</div>
                            {asks.map((ask, i) => (
                                <div key={i} className="flex h-10 items-center justify-between px-4 hover:bg-white/5 transition-colors group relative">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-rose-500/5 transition-all"
                                        style={{ width: `${ask.depth}%` }}
                                    />
                                    <div className="flex-1 grid grid-cols-3 text-right font-bold text-xs relative z-10 pr-4">
                                        <span className="text-rose-500">{ask.price}¢</span>
                                        <span className="text-gray-300">{ask.shares}</span>
                                        <span className="text-gray-400">{ask.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between px-4 py-2 border-y border-[#2D3748] bg-[#111827]/50 text-[10px] font-bold text-[#94A3B8]">
                            <div className="flex items-center gap-1">
                                <span>Last:</span>
                                <span className="text-white font-black">{lastPrice}¢</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>Spread:</span>
                                <span className="text-white font-black">{spread}¢</span>
                            </div>
                        </div>

                        {/* Bids Section */}
                        <div className="relative">
                            <div className="absolute top-2 left-4 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded border border-emerald-500/20 uppercase tracking-widest z-10">Bids</div>
                            {bids.map((bid, i) => (
                                <div key={i} className="flex h-10 items-center justify-between px-4 hover:bg-white/5 transition-colors group relative">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-emerald-500/5 transition-all"
                                        style={{ width: `${bid.depth}%` }}
                                    />
                                    <div className="flex-1 grid grid-cols-3 text-right font-bold text-xs relative z-10 pr-4">
                                        <span className="text-emerald-500">{bid.price}¢</span>
                                        <span className="text-gray-300">{bid.shares}</span>
                                        <span className="text-gray-400">{bid.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Empty/Fill Rows to ensure scrollability to 0 or 100 if needed */}
                        <div className="p-4 text-center text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 border-t border-[#2D3748]">
                            Full depth aggregated across 12 venues
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
