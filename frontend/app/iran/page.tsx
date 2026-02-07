"use client";

import React, { useState, useEffect } from "react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { OutcomeHeatmap } from "@/components/events/OutcomeHeatmap";
import { IranWarExecutionDock } from "@/components/events/IranWarExecutionDock";
import { IranSentimentChart } from "@/components/events/IranSentimentChart";
import { cn } from "@/lib/utils";

// Define types for shared state
export type RouletteSelection = {
    selectedEvents: string[];
    selectedOutcome: "yes" | "no" | null;
    selectedDate: number | string | null;
};

const LabLoader = () => (
    <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
        <div className="relative">
            <div className="w-16 h-16 border-2 border-accent-green animate-spin" style={{ borderRadius: '2px' }} />
            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter text-accent-green">
                Xiphias
            </div>
        </div>
    </div>
);

export default function IranPage() {
    const [loading, setLoading] = useState(true);
    const [probValue, setProbValue] = useState(0);

    // State for selection
    const [selection, setSelection] = useState<RouletteSelection>({
        selectedEvents: ["on"],
        selectedOutcome: null,
        selectedDate: null
    });

    const toggleEvent = (evt: string) => {
        setSelection(prev => ({
            ...prev,
            selectedEvents: prev.selectedEvents.includes(evt)
                ? prev.selectedEvents.filter(e => e !== evt)
                : [...prev.selectedEvents, evt]
        }));
    };

    const setSelectedOutcome = (outcome: "yes" | "no" | null) => {
        setSelection(prev => ({ ...prev, selectedOutcome: outcome }));
    };

    const setSelectedDate = (date: number | string | null) => {
        setSelection(prev => ({ ...prev, selectedDate: date }));
    };

    const ny06Outcomes = [
        { id: "meng", name: "US strikes Iran by...?", probability: 72, color: "#10B981", image: "/market/iranusa.png" },
        { id: "park", name: "US strikes Iran on..?", probability: 18, color: "#3B82F6", image: "/market/iranusa_2.png" },
        { id: "xiong", name: "Other Scenarios", probability: 10, color: "#F59E0B", image: "/market/iranwar.png" },
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
            const target = 78;
            let count = 0;
            const interval = setInterval(() => {
                count += 2;
                if (count >= target) {
                    setProbValue(target);
                    clearInterval(interval);
                } else {
                    setProbValue(count);
                }
            }, 30);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    if (loading) return <LabLoader />;

    return (
        <main className="min-h-screen uppercase bg-white">
            <GlobalHeader />

            <div className="max-w-7xl mx-auto px-8 pb-32 pt-6">
                {/* HEADER CONTEXT */}
                <div className="flex items-start justify-between mb-8">
                    <div className="space-y-4">
                        <nav className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8]">
                            <span>Markets</span>
                            <span className="text-accent-green">/</span>
                            <span>Politics</span>
                            <span className="text-accent-green">/</span>
                            <span className="text-text-hero">Current Order</span>
                        </nav>
                        <h1 className="text-6xl font-black text-text-hero tracking-tighter leading-none flex gap-3 font-serif">
                            Iran
                            <span className="text-accent-green-deep">War</span>
                        </h1>
                    </div>

                    <div className="text-right space-y-1">
                        <div className="flex items-center gap-3 justify-end">
                            <span className="px-2 py-0.5 bg-accent-green-subtle text-accent-green-deep text-[9px] font-black uppercase tracking-widest">+4.2% Today</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-text-body">Market Cap: $84.2M</span>
                        </div>
                        <div className="flex items-end gap-1 justify-end">
                            <span className="text-6xl font-black text-text-hero leading-none tracking-tighter">{probValue}<span className="text-2xl ml-1">%</span></span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-body">Trade Frequency: 14/min</p>
                    </div>
                </div>

                {/* EVENT SELECTION + YES/NO */}
                <div className="mb-8 space-y-6">
                    {/* Event Selection */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => toggleEvent("on")}
                            className={cn(
                                "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                                selection.selectedEvents.includes("on")
                                    ? "border-[#FF4B4B] bg-red-50"
                                    : "border-gray-100 hover:border-gray-200"
                            )}
                        >
                            <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                <img src="/market/iranusa_2.png" alt="Market Left" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-sm text-gray-900">US next strikes Iran on...?</span>
                        </button>

                        <button
                            onClick={() => toggleEvent("by")}
                            className={cn(
                                "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                                selection.selectedEvents.includes("by")
                                    ? "border-[#3B82F6] bg-blue-50"
                                    : "border-gray-100 hover:border-gray-200"
                            )}
                        >
                            <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                <img src="/market/iranusa.png" alt="Market Right" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-sm text-gray-900">US strikes Iran by...?</span>
                        </button>
                    </div>

                    {/* Yes/No Selection */}
                    <div className="flex gap-4 max-w-md mx-auto">
                        <button
                            onClick={() => setSelectedOutcome("yes")}
                            className={cn(
                                "flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center transition-all border-2",
                                selection.selectedOutcome === "yes"
                                    ? "bg-white border-[#10B981] text-[#10B981] shadow-sm"
                                    : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                            )}
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setSelectedOutcome("no")}
                            className={cn(
                                "flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center transition-all border-2",
                                selection.selectedOutcome === "no"
                                    ? "bg-white border-[#FF4B4B] text-[#FF4B4B] shadow-sm"
                                    : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                            )}
                        >
                            No
                        </button>
                    </div>
                </div>

                {/* CHART + EXECUTION DOCK SIDE BY SIDE */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
                    <IranSentimentChart
                        selection={selection}
                        onSelectDate={(day) => setSelectedDate(day)}
                    />
                    <div className="pt-0">
                        <IranWarExecutionDock selection={selection} />
                    </div>
                </div>

            </div>

        </main>
    );
}
