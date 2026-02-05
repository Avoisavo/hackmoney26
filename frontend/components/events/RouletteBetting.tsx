"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RouletteBettingProps {
    className?: string;
}

export const RouletteBetting = ({ className }: RouletteBettingProps) => {
    const [selectedEvent, setSelectedEvent] = useState<"on" | "by">("on");
    const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no" | null>(null);
    const [selectedDate, setSelectedDate] = useState<number | string | null>(null);

    const numbers = Array.from({ length: 28 }, (_, i) => i + 1);

    // Group numbers into columns (4 rows per column)
    const columns = [];
    for (let i = 0; i < numbers.length; i += 4) {
        columns.push(numbers.slice(i, i + 4));
    }

    // Add the partial numbers if any, or specific columns like 1/3, 2/3 as shown in drawing
    const extraColumn = ["1/3", "2/3"];

    // Heatmap data from the user's provided market activity
    const heatmapData: Record<number, number> = {
        5: 1,
        6: 2,
        7: 4,
        8: 6,
        9: 7,
        13: 12,
        20: 18,
        28: 28,
    };

    const getHeatmapColor = (num: number) => {
        const val = heatmapData[num];
        if (!val) return null;

        // Scale opacity based on value (1-28)
        // More popular = darker red
        const opacity = 0.1 + (val / 30) * 0.85;
        return `rgba(255, 75, 75, ${opacity})`;
    };

    return (
        <div className={cn("bg-white pt-2 pb-6 mb-4", className)}>
            <div className="flex flex-col gap-8">
                {/* Event Selection */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setSelectedEvent("on")}
                        className={cn(
                            "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                            selectedEvent === "on"
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
                        onClick={() => setSelectedEvent("by")}
                        className={cn(
                            "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                            selectedEvent === "by"
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
                            "flex-1 py-3 rounded-full font-black text-xs tracking-widest transition-all",
                            selectedOutcome === "yes"
                                ? "bg-[#10B981] text-white shadow-lg scale-105"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                    >
                        YES
                    </button>
                    <button
                        onClick={() => setSelectedOutcome("no")}
                        className={cn(
                            "flex-1 py-3 rounded-full font-black text-xs tracking-widest transition-all",
                            selectedOutcome === "no"
                                ? "bg-[#FF4B4B] text-white shadow-lg scale-105"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                    >
                        NO
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
                                        const isPopular = heatmapData[num] > 10;

                                        return (
                                            <button
                                                key={num}
                                                onClick={() => setSelectedDate(num)}
                                                style={{ backgroundColor: selectedDate === num ? undefined : (bgColor || undefined) }}
                                                className={cn(
                                                    "w-16 h-16 flex items-center justify-center border-b-2 border-black last:border-b-0 font-bold transition-all",
                                                    selectedDate === num
                                                        ? (selectedEvent === "on" ? "bg-[#FF4B4B] text-white" : "bg-[#3B82F6] text-white")
                                                        : (bgColor && isPopular ? "text-white" : "text-gray-900 hover:opacity-80")
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
