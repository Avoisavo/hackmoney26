"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import iranData from "@/data/iran.json";

import electionData from "@/data/election.json";

import { RouletteSelection } from "@/app/markets/[id]/page";

interface RouletteBettingProps {
    className?: string;
    selection: RouletteSelection;
    onSelectionChange: (sel: RouletteSelection) => void;
    customItems?: string[];
    marketType?: "election" | "iran";
}

const DEMOCRATS = [
    "Josh Shapiro", "Gretchen Whitmer", "Jon Stewart", "Gavin Newsom",
    "Zohran Mamdani", "Mark Kelly", "Pete Buttigieg", "Wes Moore",
    "Tim Walz", "Michelle Obama", "Rahm Emanuel", "Alexandria Ocasio-Cortez",
    "Andy Beshear", "Kamala Harris", "JB Pritzker"
];

const REPUBLICANS = [
    "JD Vance", "Marco Rubio", "Donald Trump", "Ron DeSantis", "Ivanka Trump",
    "Donald Trump Jr.", "Vivek Ramaswamy", "Glenn Youngkin", "Nikki Haley",
    "Tulsi Gabbard", "Greg Abbott", "Marjorie Taylor Greene", "Ted Cruz"
];

const BOTH_PARTIES = [
    "Kim Kardashian", "LeBron James", "Dwayne 'The Rock' Johnson",
    "Tucker Carlson", "Elon Musk", "Jamie Dimon", "Stephen A. Smith"
];

export const RouletteBetting = ({ className, selection, onSelectionChange, customItems, marketType = "iran" }: RouletteBettingProps) => {
    // Destructure from props
    const { selectedEvents, selectedOutcome, selectedCells } = selection;

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

    // Helper for election market (single selection using selectedDate from selection - legacy support)
    const selectedDate = (selection as any).selectedDate;
    const setSelectedDate = (date: number | string | null) => onSelectionChange({ ...selection, selectedDate: date } as any);

    // Toggle cell selection for multi-select (Iran market)
    const toggleCell = (item: number) => {
        const existingIndex = selectedCells.findIndex((c: { day: number; cents: number }) => c.day === item);
        if (existingIndex >= 0) {
            // Remove if already selected
            onSelectionChange({
                ...selection,
                selectedCells: selectedCells.filter((_: any, i: number) => i !== existingIndex)
            });
        } else {
            // Add new cell (with a default cents value based on the market data)
            const onVal = probMaps.onMap[item];
            const byVal = probMaps.byMap[item];
            const cents = onVal ?? byVal ?? 50;
            onSelectionChange({
                ...selection,
                selectedCells: [...selectedCells, { day: item, cents }]
            });
        }
    };

    // Check if a day is selected in multi-select mode
    const isCellSelected = (item: number) => selectedCells.some((c: { day: number; cents: number }) => c.day === item);

    // Get prices for selected date
    const selectedDatePrices = React.useMemo(() => {
        if (selectedDate === null || selectedDate === 0) return null;

        if (marketType === "election") {
            // Find relevant markets from election.json based on selectedEvents
            const results: { type: string; data: any }[] = [];

            selectedEvents.forEach(evt => {
                let targetType = "";
                if (evt === "winner") targetType = "candidate_winner";
                if (evt === "democrat") targetType = "candidate_nominee_dem";
                if (evt === "republican") targetType = "candidate_nominee_gop";

                if (targetType) {
                    const market = electionData.markets.find(m => m.type === targetType);
                    if (market) {
                        const candidateData = market.data.find(d =>
                            d.name.toLowerCase() === (selectedDate as string).toLowerCase() ||
                            (d.name === "J.D. Vance" && selectedDate === "JD Vance") ||
                            (d.name === "J.B. Pritzker" && selectedDate === "JB Pritzker")
                        );
                        if (candidateData) {
                            results.push({ type: targetType, data: candidateData });
                        }
                    }
                }
            });
            return results.length > 0 ? results : null;
        }

        if (!activeMarkets.length || typeof selectedDate !== 'number') return null;

        return activeMarkets.map(m => {
            const data = m.data.find(d => parseInt(d.date.split('-')[2], 10) === selectedDate);
            return { type: m.type, data };
        }).filter(item => item.data);
    }, [activeMarkets, selectedDate, marketType, selectedEvents]);

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

    const getCandidateProb = (name: string | number) => {
        if (marketType !== "election" || typeof name !== 'string') return null;
        const activeEvent = selectedEvents[0] || "winner";

        let targetType = "";
        if (activeEvent === "winner") targetType = "candidate_winner";
        if (activeEvent === "democrat") targetType = "candidate_nominee_dem";
        if (activeEvent === "republican") targetType = "candidate_nominee_gop";

        if (!targetType) return null;

        const market = electionData.markets.find(m => m.type === targetType);
        if (!market) return null;

        const candidateData = market.data.find(d =>
            d.name.toLowerCase() === name.toLowerCase() ||
            (d.name === "J.D. Vance" && name === "JD Vance") ||
            (d.name === "J.B. Pritzker" && name === "JB Pritzker")
        );

        return candidateData ? candidateData.yes_cents : null;
    };

    const getCandidateTrend = (name: string | number) => {
        if (marketType !== "election" || typeof name !== 'string') return null;

        const trends: Record<string, { val: string, color: string, isUp: boolean }> = {
            "Gavin Newsom": { val: "11%", color: "text-emerald-500", isUp: true },
            "Kamala Harris": { val: "5%", color: "text-emerald-500", isUp: true },
            "JD Vance": { val: "8%", color: "text-emerald-500", isUp: true },
            "Marco Rubio": { val: "4%", color: "text-rose-500", isUp: false },
            "Ron DeSantis": { val: "6%", color: "text-rose-500", isUp: false }
        };

        return trends[name] || null;
    };

    // Get trend for Iran market days
    const getDayTrend = (day: number) => {
        if (marketType !== "iran") return null;

        // Only show trends on specific days: 15, 17, 20, 26, 28
        const dayTrends: Record<number, { val: string, color: string, isUp: boolean }> = {
            15: { val: "8%", color: "text-emerald-500", isUp: true },
            17: { val: "12%", color: "text-rose-500", isUp: false },
            20: { val: "19%", color: "text-emerald-500", isUp: true },
            26: { val: "24%", color: "text-emerald-500", isUp: true },
            28: { val: "6%", color: "text-rose-500", isUp: false },
        };

        return dayTrends[day] || null;
    };

    // Check if day is resolved (1-8 resolved as No)
    const isDayResolved = (day: number) => {
        if (marketType !== "iran") return null;
        if (day >= 1 && day <= 8) {
            return { resolved: true, outcome: "No" };
        }
        return null;
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
                <div className="flex gap-4 max-w-xl mx-auto">
                    <button
                        onClick={() => setSelectedOutcome("yes")}
                        className={cn(
                            "flex-1 h-auto min-h-[56px] py-3 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all border-2",
                            selectedOutcome === "yes"
                                ? "bg-white border-[#10B981] text-[#10B981] shadow-sm"
                                : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span>Yes</span>
                            {marketType === "election" && selectedDatePrices && selectedDatePrices.length > 0 && (
                                <span className="text-gray-900 font-black text-xl">
                                    {(selectedDatePrices[0].data?.yes_cents).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        {selectedDatePrices && selectedDatePrices.length > 0 && (
                            <div className="flex flex-col text-[10px] items-center leading-tight">
                                {selectedDatePrices.map((p, i) => {
                                    const price = p.data?.yes_cents;
                                    const payout = price > 0 ? (10 / (price / 100)).toFixed(2) : "0.00";
                                    return (
                                        <span key={i} className="text-gray-500 font-medium">
                                            {marketType === "election" ? `Return: $${payout}` : `${p.type === "on_date" ? "ON" : "BY"}: ${price.toFixed(1)}¢`}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </button>
                    <button
                        onClick={() => setSelectedOutcome("no")}
                        className={cn(
                            "flex-1 h-auto min-h-[56px] py-3 rounded-2xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all border-2",
                            selectedOutcome === "no"
                                ? "bg-white border-[#FF4B4B] text-[#FF4B4B] shadow-sm"
                                : "bg-white border-transparent hover:bg-gray-50 text-gray-400"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span>No</span>
                            {marketType === "election" && selectedDatePrices && selectedDatePrices.length > 0 && (
                                <span className="text-gray-900 font-black text-xl">
                                    {(selectedDatePrices[0].data?.no_cents).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        {selectedDatePrices && selectedDatePrices.length > 0 && (
                            <div className="flex flex-col text-[10px] items-center leading-tight">
                                {selectedDatePrices.map((p, i) => {
                                    const price = p.data?.no_cents;
                                    const payout = price > 0 ? (10 / (price / 100)).toFixed(2) : "0.00";
                                    return (
                                        <span key={i} className="text-gray-500 font-medium">
                                            {marketType === "election" ? `Return: $${payout}` : `${p.type === "on_date" ? "ON" : "BY"}: ${price.toFixed(1)}¢`}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </button>
                </div>

                {/* Roulette Grid */}
                <div className="relative mt-4">
                    <div className="flex items-stretch border-2 border-black rounded-lg overflow-hidden bg-white max-w-fit mx-auto">

                        {/* Number Grid Columns */}
                        <div className="flex overflow-x-auto no-scrollbar">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col border-r-2 border-black last:border-r-0">
                                    {col.map((item) => {
                                        const bgColor = getHeatmapColor(item);
                                        const onVal = typeof item === 'number' ? probMaps.onMap[item] : undefined;
                                        const byVal = typeof item === 'number' ? probMaps.byMap[item] : undefined;
                                        const isResolvedDay = typeof item === "number" && !!isDayResolved(item);
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
                                        const isMultiSelect = isDemMarket && isRepMarket;

                                        const isFilteredOut = !isMultiSelect && (
                                            (isDemMarket && !DEMOCRATS.includes(item as string) && !BOTH_PARTIES.includes(item as string)) ||
                                            (isRepMarket && !REPUBLICANS.includes(item as string) && !BOTH_PARTIES.includes(item as string))
                                        );

                                        const isSelected =
                                            !isResolvedDay &&
                                            (marketType === "iran" && typeof item === "number"
                                                ? isCellSelected(item)
                                                : selectedDate === item);

                                        const cornerProb =
                                            marketType === "election"
                                                ? (typeof item === "string" ? getCandidateProb(item) : null)
                                                : (typeof item === "number" ? (onVal ?? byVal ?? null) : null);

                                        const cornerTrend =
                                            marketType === "election"
                                                ? (typeof item === "string" ? getCandidateTrend(item) : null)
                                                : (typeof item === "number" ? getDayTrend(item) : null);

                                        return (
                                            <button
                                                key={item}
                                                onClick={() => {
                                                    if (isFilteredOut) return;
                                                    if (isResolvedDay) return;
                                                    if (marketType === "iran" && typeof item === "number") {
                                                        toggleCell(item);
                                                    } else {
                                                        setSelectedDate(item);
                                                    }
                                                }}
                                                disabled={isFilteredOut || isResolvedDay}
                                                style={{
                                                    backgroundColor: isSelected
                                                        ? undefined
                                                        : (isFilteredOut
                                                            ? "#000000"
                                                            : (isResolvedDay ? "#1e293b" : (bgColor || undefined)))
                                                }}
                                                className={cn(
                                                    "w-24 h-24 flex flex-col items-stretch border-b-2 border-black last:border-b-0 font-black transition-all text-center leading-none uppercase break-words overflow-hidden relative group/item",
                                                    isFilteredOut
                                                        ? "cursor-not-allowed opacity-100" // Custom black style below
                                                        : (isResolvedDay
                                                            ? "cursor-not-allowed"
                                                            : (isSelected
                                                            ? (selectedEvents.includes("on") && selectedEvents.includes("by")
                                                                ? "bg-purple-600 text-white ring-4 ring-purple-300"
                                                                : selectedEvents.includes("on")
                                                                    ? "bg-[#FF4B4B] text-white ring-4 ring-red-300"
                                                                    : "bg-[#3B82F6] text-white ring-4 ring-blue-300")
                                                            : (isDark ? "text-white" : "text-gray-900 hover:opacity-80"))
                                                        )
                                                )}
                                            >
                                                {/* Corner badges */}
                                                {!isFilteredOut && !isResolvedDay && cornerTrend && (
                                                    <div className="absolute top-1 left-1 z-10 pointer-events-none select-none">
                                                        <div className={cn(
                                                            "rounded px-1 py-0.5 text-[10px] font-black leading-none",
                                                            isDark ? "bg-black/25" : "bg-white/70",
                                                            cornerTrend.color
                                                        )}>
                                                            {cornerTrend.isUp ? "▲" : "▼"} {cornerTrend.val}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isFilteredOut && !isResolvedDay && cornerProb !== null && (
                                                    <div className="absolute top-1 right-1 z-10 pointer-events-none select-none">
                                                        <div className={cn(
                                                            "rounded px-1 py-0.5 text-[10px] font-black leading-none",
                                                            isDark ? "bg-black/25 text-white" : "bg-white/70 text-slate-900"
                                                        )}>
                                                            {cornerProb.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                )}

                                                {candidateImg ? (
                                                    <>
                                                        <div className={cn(
                                                            "h-20 w-full border-b border-black/10 overflow-hidden relative",
                                                            isFilteredOut && "grayscale opacity-20"
                                                        )}>
                                                            <img src={candidateImg} alt="" className="w-full h-full object-cover" />
                                                            {!isFilteredOut && <div className="absolute inset-0 bg-black/5 group-hover/item:bg-transparent transition-colors" />}
                                                        </div>
                                                        <div className="flex-1 flex flex-col items-center justify-center p-1 gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className={cn(
                                                                    "text-[9px] font-black leading-none",
                                                                    isFilteredOut ? "text-white/20" : "text-gray-900"
                                                                )}>{item}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className={cn(
                                                        "flex-1 flex flex-col items-center justify-center p-1 gap-0.5",
                                                        isFilteredOut ? "text-white/20" : ""
                                                    )}>
                                                        {typeof item === 'number' && isDayResolved(item) ? (
                                                            // Resolved day - show No with X icon
                                                            <>
                                                                <span className="text-lg font-black text-white">{item}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-sm font-bold text-white">No</span>
                                                                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                                                        <span className="text-white text-xs font-bold">✕</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            // Active day - show percentage and trend
                                                            <>
                                                                <span className="text-lg font-black">{item}</span>
                                                            </>
                                                        )}
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
                                            "w-20 h-36 flex items-center justify-center border-b-2 border-black last:border-b-0 font-black text-base transition-all",
                                            selectedDate === fract ? "bg-black text-white" : "hover:bg-gray-50"
                                        )}
                                    >
                                        {fract}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Row: Special Bets */}
                    <div className="flex border-2 border-black border-t-0 rounded-b-lg overflow-hidden bg-white max-w-fit mx-auto">
                        <button
                            onClick={() => setSelectedDate("1 to 14")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center border-r-2 border-black font-black text-lg transition-all",
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
                            <div className="w-8 h-8 rotate-45 border-2 border-black/20 bg-[#FF4B4B]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("Blue")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center border-r-2 border-black transition-all",
                                selectedDate === "Blue" ? "bg-[#3B82F6] text-white" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="w-8 h-8 rotate-45 border-2 border-black/20 bg-[#3B82F6]" />
                        </button>
                        <button
                            onClick={() => setSelectedDate("ODD")}
                            className={cn(
                                "w-[168px] h-16 flex items-center justify-center font-black text-lg transition-all",
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
