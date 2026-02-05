"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import iranData from "@/data/iran.json";

import { RouletteSelection } from "@/app/markets/[id]/page";

interface RouletteBettingProps {
    className?: string;
    selection: RouletteSelection;
    onSelectionChange: (sel: RouletteSelection) => void;
}

export const RouletteBetting = ({ className, selection, onSelectionChange }: RouletteBettingProps) => {
    // Destructure from props
    const { selectedEvents, selectedOutcome, selectedDate } = selection;

    const toggleEvent = (evt: "on" | "by") => {
        onSelectionChange({
            ...selection,
            selectedEvents: selectedEvents.includes(evt)
                ? selectedEvents.filter(e => e !== evt)
                : [...selectedEvents, evt]
        });
    };

    // Helper wrappers
    const setSelectedOutcome = (outcome: "yes" | "no" | null) => onSelectionChange({ ...selection, selectedOutcome: outcome });
    const setSelectedDate = (date: number | string | null) => onSelectionChange({ ...selection, selectedDate: date });

    const numbers = Array.from({ length: 28 }, (_, i) => i + 1);

    // Group numbers into columns (4 rows per column)
    const columns = [];
    for (let i = 0; i < numbers.length; i += 4) {
        columns.push(numbers.slice(i, i + 4));
    }

    // Add the partial numbers if any, or specific columns like 1/3, 2/3 as shown in drawing
    const extraColumn = ["1/3", "2/3"];

    // Get active markets based on selection
    const activeMarkets = React.useMemo(() => {
        return iranData.markets.filter(m =>
            (m.type === "on_date" && selectedEvents.includes("on")) ||
            (m.type === "by_date" && selectedEvents.includes("by"))
        );
    }, [selectedEvents]);

    // Create maps for On and By probabilities
    const probMaps = React.useMemo(() => {
        const onMap: Record<number, number> = {};
        const byMap: Record<number, number> = {};

        activeMarkets.forEach(m => {
            m.data.forEach(d => {
                const day = parseInt(d.date.split('-')[2], 10);
                const val = selectedOutcome === "no" ? d.no_cents : d.yes_cents;
                if (m.type === "on_date") onMap[day] = val;
                if (m.type === "by_date") byMap[day] = val;
            });
        });
        return { onMap, byMap };
    }, [activeMarkets, selectedOutcome]);

    // Find min/max for scaling (global or per map? let's do global for consistent intensity)
    const { minProb, maxProb } = React.useMemo(() => {
        const allValues = [
            ...Object.values(probMaps.onMap),
            ...Object.values(probMaps.byMap)
        ];
        if (allValues.length === 0) return { minProb: 0, maxProb: 100 };
        return {
            minProb: Math.min(...allValues),
            maxProb: Math.max(...allValues)
        };
    }, [probMaps]);

    // Get prices for selected date
    const selectedDatePrices = React.useMemo(() => {
        if (!activeMarkets.length || selectedDate === null || typeof selectedDate !== 'number' || selectedDate === 0) return null;

        return activeMarkets.map(m => {
            const data = m.data.find(d => parseInt(d.date.split('-')[2], 10) === selectedDate);
            return { type: m.type, data };
        }).filter(item => item.data);
    }, [activeMarkets, selectedDate]);

    const getHeatmapColor = (num: number) => {
        const onVal = probMaps.onMap[num];
        const byVal = probMaps.byMap[num];

        const hasOn = onVal !== undefined;
        const hasBy = byVal !== undefined;

        if (!hasOn && !hasBy) return null;

        const range = maxProb - minProb;
        const normalize = (val: number) => range === 0 ? 0.5 : (val - minProb) / range;

        // Blend colors
        if (hasOn && hasBy) {
            // Both selected: Blend Red and Blue -> Purple
            // We'll average the normalized intensities for opacity, or use separate channels
            const normOn = normalize(onVal);
            const normBy = normalize(byVal);

            // CSS color-mix or rgba blending
            // Simple approach: Average opacity, use Purple
            const avgNorm = (normOn + normBy) / 2;
            const opacity = 0.2 + (avgNorm * 0.8);
            return `rgba(147, 51, 234, ${opacity})`; // Purple
        } else if (hasOn) {
            const opacity = 0.1 + (normalize(onVal) * 0.75);
            return `rgba(255, 75, 75, ${opacity})`; // Red
        } else {
            const opacity = 0.1 + (normalize(byVal) * 0.75);
            return `rgba(59, 130, 246, ${opacity})`; // Blue
        }
    };

    return (
        <div className={cn("bg-white pt-2 pb-6 mb-4", className)}>
            <div className="flex flex-col gap-8">
                {/* Event Selection */}
                <div className="flex gap-4">
                    <button
                        onClick={() => toggleEvent("on")}
                        className={cn(
                            "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                            selectedEvents.includes("on")
                                ? "border-[#FF4B4B] bg-red-50"
                                : "border-gray-100 hover:border-gray-200"
                        )}
                    >
                        <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="/market/iranwar.png" alt="Iran War" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-sm text-gray-900">US next strikes Iran on...?</span>
                    </button>

                    <button
                        onClick={() => toggleEvent("by")}
                        className={cn(
                            "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                            selectedEvents.includes("by")
                                ? "border-[#3B82F6] bg-blue-50"
                                : "border-gray-100 hover:border-gray-200"
                        )}
                    >
                        <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="/market/iranwar.png" alt="Iran War" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-sm text-gray-900">US strikes Iran by...?</span>
                    </button>
                </div>

                {/* Yes/No Selection */}
                <div className="flex gap-4 max-w-md">
                    <button
                        onClick={() => setSelectedOutcome("yes")}
                        className={cn(
                            "flex-1 h-auto min-h-[48px] py-2 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all border-2",
                            selectedOutcome === "yes"
                                ? "bg-white border-[#10B981] text-[#10B981] shadow-sm"
                                : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                        )}
                    >
                        <span>Yes</span>
                        {selectedDatePrices && selectedDatePrices.length > 0 && (
                            <div className="flex flex-col text-[10px] items-center leading-tight">
                                {selectedDatePrices.map((p, i) => (
                                    <span key={i} className="text-gray-900 font-bold whitespace-nowrap">
                                        {p.type === "on_date" ? "ON" : "BY"}: {p.data?.yes_cents.toFixed(1)}¢
                                    </span>
                                ))}
                            </div>
                        )}
                    </button>
                    <button
                        onClick={() => setSelectedOutcome("no")}
                        className={cn(
                            "flex-1 h-auto min-h-[48px] py-2 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all border-2",
                            selectedOutcome === "no"
                                ? "bg-white border-[#FF4B4B] text-[#FF4B4B] shadow-sm"
                                : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                        )}
                    >
                        <span>No</span>
                        {selectedDatePrices && selectedDatePrices.length > 0 && (
                            <div className="flex flex-col text-[10px] items-center leading-tight">
                                {selectedDatePrices.map((p, i) => (
                                    <span key={i} className="text-gray-900 font-bold whitespace-nowrap">
                                        {p.type === "on_date" ? "ON" : "BY"}: {p.data?.no_cents.toFixed(1)}¢
                                    </span>
                                ))}
                            </div>
                        )}
                    </button>
                </div>

                {/* Roulette Grid */}
                <div className="relative mt-4 ml-12">
                    <div className="flex items-stretch border-2 border-black rounded-lg overflow-hidden bg-white max-w-fit">
                        {/* 0 / Never Happen Section */}
                        <button
                            onClick={() => setSelectedDate(0)}
                            className={cn(
                                "w-24 flex items-center justify-center border-r-2 border-black p-4 text-center transition-colors",
                                selectedDate === 0 ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-[10px] font-medium leading-tight">(never happen)</span>
                            </div>
                        </button>

                        {/* Number Grid Columns */}
                        <div className="flex overflow-x-auto no-scrollbar">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col border-r-2 border-black last:border-r-0">
                                    {col.map((num) => {
                                        const bgColor = getHeatmapColor(num);
                                        // Highlight if opacity > some threshold (e.g. > 0.4 which roughly means upper half of relative intensity)
                                        // or just rely on text color contrast. White text on dark red is better.
                                        const onVal = probMaps.onMap[num];
                                        const byVal = probMaps.byMap[num];
                                        let relativeIntensity = 0;
                                        const range = maxProb - minProb;
                                        const normalize = (v: number) => range === 0 ? 0 : (v - minProb) / range;

                                        if (selectedEvents.includes("on") && selectedEvents.includes("by") && onVal !== undefined && byVal !== undefined) {
                                            relativeIntensity = (normalize(onVal) + normalize(byVal)) / 2;
                                        } else if (selectedEvents.includes("on") && onVal !== undefined) {
                                            relativeIntensity = normalize(onVal);
                                        } else if (selectedEvents.includes("by") && byVal !== undefined) {
                                            relativeIntensity = normalize(byVal);
                                        }

                                        const isDark = relativeIntensity > 0.5;

                                        return (
                                            <button
                                                key={num}
                                                onClick={() => setSelectedDate(num)}
                                                style={{ backgroundColor: selectedDate === num ? undefined : (bgColor || undefined) }}
                                                className={cn(
                                                    "w-16 h-16 flex items-center justify-center border-b-2 border-black last:border-b-0 font-bold transition-all",
                                                    selectedDate === num
                                                        ? (selectedEvents.includes("on") && selectedEvents.includes("by")
                                                            ? "bg-purple-600 text-white"
                                                            : selectedEvents.includes("on")
                                                                ? "bg-[#FF4B4B] text-white"
                                                                : "bg-[#3B82F6] text-white")
                                                        : (isDark ? "text-white" : "text-gray-900 hover:opacity-80")
                                                )}
                                            >
                                                {num}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Final Fractions Column */}
                            <div className="flex flex-col">
                                {extraColumn.map((fract) => (
                                    <button
                                        key={fract}
                                        onClick={() => setSelectedDate(fract)}
                                        className={cn(
                                            "w-16 h-32 flex items-center justify-center border-b-2 border-black last:border-b-0 font-bold transition-all",
                                            selectedDate === fract ? "bg-black text-white" : "hover:bg-gray-50"
                                        )}
                                    >
                                        {fract}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Row 1: Halves */}
                    <div className="flex border-2 border-black border-t-0 rounded-b-none overflow-hidden bg-white max-w-fit ml-24">
                        <button
                            onClick={() => setSelectedDate("1st 14")}
                            className={cn(
                                "flex-1 w-[224px] h-12 flex items-center justify-center border-r-2 border-black font-bold transition-all",
                                selectedDate === "1st 14" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            1st 14
                        </button>
                        <button
                            onClick={() => setSelectedDate("2nd 15")}
                            className={cn(
                                "flex-1 w-[224px] h-12 flex items-center justify-center font-bold transition-all",
                                selectedDate === "2nd 15" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            2nd 15
                        </button>
                    </div>

                    {/* Footer Row 2: Special Bets */}
                    <div className="flex border-2 border-black border-t-0 rounded-b-lg overflow-hidden bg-white max-w-fit ml-24">
                        <button
                            onClick={() => setSelectedDate("1 to 14")}
                            className={cn(
                                "w-[112px] h-12 flex items-center justify-center border-r-2 border-black font-bold text-xs transition-all",
                                selectedDate === "1 to 14" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            1 to 14
                        </button>
                        <button
                            onClick={() => setSelectedDate("Red")}
                            className={cn(
                                "w-[112px] h-12 flex items-center justify-center border-r-2 border-black transition-all",
                                selectedDate === "Red" ? "bg-[#FF4B4B] text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="w-6 h-6 rotate-45 border-2 border-black/20 bg-[#FF4B4B]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("Blue")}
                            className={cn(
                                "w-[112px] h-12 flex items-center justify-center border-r-2 border-black transition-all",
                                selectedDate === "Blue" ? "bg-[#3B82F6] text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="w-6 h-6 rotate-45 border-2 border-black/20 bg-[#3B82F6]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("ODD")}
                            className={cn(
                                "w-[112px] h-12 flex items-center justify-center font-bold text-xs transition-all",
                                selectedDate === "ODD" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            ODD
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
