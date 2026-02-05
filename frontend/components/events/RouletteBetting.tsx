"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import iranData from "@/data/iran.json";

import { RouletteSelection } from "@/app/markets/[id]/page";

interface RouletteBettingProps {
    className?: string;
    selection: RouletteSelection;
    onSelectionChange: (sel: RouletteSelection) => void;
    customItems?: string[];
    marketType?: "election" | "iran";
}

const DEMOCRATS = [
    "Gavin Newsom", "Alexandria Ocasio-Cortez", "Kamala Harris", "Josh Shapiro",
    "Pete Buttigieg", "Andy Beshear", "JB Pritzker", "Wes Moore", "Gretchen Whitmer",
    "Tim Walz", "Zohran Mamdani", "Michelle Obama", "Jon Stewart", "Mark Kelly",
    "Rahm Emanuel", "LeBron James", "Stephen A. Smith", "Dwayne 'The Rock' Johnson", "Jamie Dimon"
];

const REPUBLICANS = [
    "JD Vance", "Marco Rubio", "Donald Trump", "Ron DeSantis", "Ivanka Trump",
    "Elon Musk", "Donald Trump Jr.", "Vivek Ramaswamy", "Glenn Youngkin",
    "Tucker Carlson", "Nikki Haley", "Tulsi Gabbard", "Greg Abbott",
    "Marjorie Taylor Greene", "Ted Cruz", "Kim Kardashian"
];

export const RouletteBetting = ({ className, selection, onSelectionChange, customItems, marketType = "iran" }: RouletteBettingProps) => {
    // Destructure from props
    const { selectedEvents, selectedOutcome, selectedDate } = selection;

    const toggleEvent = (evt: string) => {
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

    const items = customItems || Array.from({ length: 28 }, (_, i) => i + 1);

    // Group items into columns
    const columns = [];
    const itemsPerColumn = marketType === "election" ? 5 : 4;
    for (let i = 0; i < items.length; i += itemsPerColumn) {
        columns.push(items.slice(i, i + itemsPerColumn));
    }

    // Add the partial numbers if any, or specific columns like 1/3, 2/3 as shown in drawing
    const extraColumn = marketType === "election" ? [] : ["1/3", "2/3"];

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

    const getHeatmapColor = (item: string | number) => {
        const onVal = typeof item === 'number' ? probMaps.onMap[item] : undefined;
        const byVal = typeof item === 'number' ? probMaps.byMap[item] : undefined;

        const hasOn = onVal !== undefined;
        const hasBy = byVal !== undefined;

        if (!hasOn && !hasBy) return null;

        const range = maxProb - minProb;
        const normalize = (val: number | undefined) => {
            if (val === undefined) return 0;
            return range === 0 ? 0.5 : (val - minProb) / range;
        };

        // Blend colors
        if (hasOn && hasBy) {
            const normOn = normalize(onVal);
            const normBy = normalize(byVal);
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

    const getImageForCandidate = (name: string | number) => {
        if (typeof name !== 'string') return null;
        const mapping: Record<string, string> = {
            "JD Vance": "jdvance.png",
            "Marco Rubio": "marcorubio.png",
            "Alexandria Ocasio-Cortez": "AlexandriaOcasio-Cortez.png",
            "Kamala Harris": "KamalaHarris.png",
            "Josh Shapiro": "joshshapiro.png",
            "Donald Trump": "donaldtrump.png",
            "Pete Buttigieg": "PeteButtigieg.png",
            "Andy Beshear": "AndyBeshear.png",
            "JB Pritzker": "JBPritzker.png",
            "Ron DeSantis": "rondesantis.png",
            "Gretchen Whitmer": "gretchenwhitmer.png",
            "Dwayne 'The Rock' Johnson": "Dwayne'The Rock'Johnson.png",
            "Wes Moore": "WesMoore.png",
            "Ivanka Trump": "ivankatrump.png",
            "Elon Musk": "elonmusk.png",
            "Vivek Ramaswamy": "VivekRamaswamy.png",
            "LeBron James": "LeBronJames.png",
            "Glenn Youngkin": "GlennYoungkin.png",
            "Tucker Carlson": "TuckerCarlson.png",
            "Nikki Haley": "NikkiHaley.png",
            "Tim Walz": "timWalz.png",
            "Tulsi Gabbard": "TulsiGabbard.png",
            "Jamie Dimon": "JamieDimon.png",
            "Kim Kardashian": "kimkardashain.png",
            "Zohran Mamdani": "ZohranMamdani.png",
            "Michelle Obama": "MichelleObama.png",
            "Greg Abbott": "GregAbbott.png",
            "Donald Trump Jr.": "donaldtrumpjr.png",
            "Gavin Newsom": "gavinnewson.png",
            "Jon Stewart": "jonstewart.png",
            "Mark Kelly": "markkelly.png",
            "Rahm Emanuel": "rahmemanuel.png",
            "Marjorie Taylor Greene": "marjorietaylorgreene.png",
            "Ted Cruz": "tedcruz.png",
            "Stephen A. Smith": "StephenSmith.png"
        };
        return mapping[name] ? `/electiongrid/${mapping[name]}` : null;
    };

    return (
        <div className={cn("bg-white pt-2 pb-6 mb-4", className)}>
            <div className="flex flex-col gap-8">
                {/* Event Selection */}
                <div className="flex gap-4">
                    {marketType === "election" ? (
                        <>
                            <button
                                onClick={() => toggleEvent("winner")}
                                className={cn(
                                    "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                                    selectedEvents.includes("winner")
                                        ? "border-[#FF4B4B] bg-red-50"
                                        : "border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src="/market/president.png" alt="Election Winner" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">Presidential Election Winner 2028</span>
                            </button>

                            <button
                                onClick={() => toggleEvent("democrat")}
                                className={cn(
                                    "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                                    selectedEvents.includes("democrat")
                                        ? "border-[#3B82F6] bg-blue-50"
                                        : "border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src="/market/democratic.png" alt="Democratic Nominee" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">Democratic Presidential Nominee 2028</span>
                            </button>

                            <button
                                onClick={() => toggleEvent("republican")}
                                className={cn(
                                    "flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                                    selectedEvents.includes("republican")
                                        ? "border-[#FF4B4B] bg-red-50"
                                        : "border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src="/market/republican.png" alt="Republican Nominee" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">Republican Presidential Nominee 2028</span>
                            </button>
                        </>
                    ) : (
                        <>
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
                                    <img src="/market/iranusa_2.png" alt="Market Left" className="w-full h-full object-cover" />
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
                                    <img src="/market/iranusa.png" alt="Market Right" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">US strikes Iran by...?</span>
                            </button>
                        </>
                    )}
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
                        {/* ALL Section */}
                        <button
                            onClick={() => setSelectedDate(0)}
                            className={cn(
                                "w-24 flex items-center justify-center border-r-2 border-black p-4 text-center transition-colors",
                                selectedDate === 0 ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-black">ALL</span>
                            </div>
                        </button>

                        {/* Number Grid Columns */}
                        <div className="flex overflow-x-auto no-scrollbar">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col border-r-2 border-black last:border-r-0">
                                    {col.map((item) => {
                                        const bgColor = getHeatmapColor(item);
                                        const onVal = typeof item === 'number' ? probMaps.onMap[item] : undefined;
                                        const byVal = typeof item === 'number' ? probMaps.byMap[item] : undefined;
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

                                        const candidateImg = getImageForCandidate(item);

                                        const isDemMarket = selectedEvents.includes("democrat");
                                        const isRepMarket = selectedEvents.includes("republican");
                                        const isFilteredOut = (isDemMarket && !DEMOCRATS.includes(item as string)) ||
                                            (isRepMarket && !REPUBLICANS.includes(item as string));

                                        return (
                                            <button
                                                key={item}
                                                onClick={() => !isFilteredOut && setSelectedDate(item)}
                                                disabled={isFilteredOut}
                                                style={{ backgroundColor: selectedDate === item ? undefined : (isFilteredOut ? "#000000" : (bgColor || undefined)) }}
                                                className={cn(
                                                    "w-24 h-24 flex flex-col items-stretch border-b-2 border-black last:border-b-0 font-black transition-all text-center leading-none uppercase break-words overflow-hidden relative group/item",
                                                    isFilteredOut
                                                        ? "cursor-not-allowed opacity-100" // Custom black style below
                                                        : (selectedDate === item
                                                            ? (selectedEvents.includes("on") && selectedEvents.includes("by")
                                                                ? "bg-purple-600 text-white"
                                                                : selectedEvents.includes("on")
                                                                    ? "bg-[#FF4B4B] text-white"
                                                                    : "bg-[#3B82F6] text-white")
                                                            : (isDark ? "text-white" : "text-gray-900 hover:opacity-80"))
                                                )}
                                            >
                                                {candidateImg ? (
                                                    <>
                                                        <div className={cn(
                                                            "h-14 w-full border-b border-black/10 overflow-hidden relative",
                                                            isFilteredOut && "grayscale opacity-20"
                                                        )}>
                                                            <img src={candidateImg} alt="" className="w-full h-full object-cover" />
                                                            {!isFilteredOut && <div className="absolute inset-0 bg-black/5 group-hover/item:bg-transparent transition-colors" />}
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-center p-1">
                                                            <span className={cn(
                                                                "text-[9px] font-black leading-[1.1]",
                                                                isFilteredOut ? "text-white/20" : ""
                                                            )}>{item}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className={cn(
                                                        "flex-1 flex items-center justify-center p-2 text-sm",
                                                        isFilteredOut ? "text-white/20" : ""
                                                    )}>
                                                        {item}
                                                    </div>
                                                )}
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
                                            "w-24 h-48 flex items-center justify-center border-b-2 border-black last:border-b-0 font-black text-lg transition-all",
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
                            onClick={() => setSelectedDate("democratic president nominee 2028")}
                            className={cn(
                                "flex-1 w-[336px] h-20 flex items-center justify-center border-r-2 border-black font-black transition-all text-base px-6 text-center leading-tight uppercase",
                                selectedDate === "democratic president nominee 2028" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            democratic president nominee 2028
                        </button>
                        <button
                            onClick={() => setSelectedDate("republician presidental2028")}
                            className={cn(
                                "flex-1 w-[336px] h-20 flex items-center justify-center font-black transition-all text-base px-6 text-center leading-tight uppercase",
                                selectedDate === "republician presidental2028" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            republician presidental2028
                        </button>
                    </div>

                    {/* Footer Row 2: Special Bets */}
                    <div className="flex border-2 border-black border-t-0 rounded-b-lg overflow-hidden bg-white max-w-fit ml-24">
                        <button
                            onClick={() => setSelectedDate("1 to 14")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center border-r-2 border-black font-black text-xl transition-all",
                                selectedDate === "1 to 14" ? "bg-black text-white" : "hover:bg-gray-50"
                            )}
                        >
                            1 to 14
                        </button>
                        <button
                            onClick={() => setSelectedDate("Red")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center border-r-2 border-black transition-all",
                                selectedDate === "Red" ? "bg-[#FF4B4B] text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="w-10 h-10 rotate-45 border-2 border-black/20 bg-[#FF4B4B]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("Blue")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center border-r-2 border-black transition-all",
                                selectedDate === "Blue" ? "bg-[#3B82F6] text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="w-10 h-10 rotate-45 border-2 border-black/20 bg-[#3B82F6]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("ODD")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center font-black text-xl transition-all",
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
