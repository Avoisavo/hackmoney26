"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LabHeader, InsightsTicker } from "@/components/shared/SharedUI";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { cn } from "@/lib/utils";
import { OutcomeHeatmap } from "@/components/events/OutcomeHeatmap";
import { AggregateExecutionDock } from "@/components/events/AggregateExecutionDock";
import { RouletteBetting } from "@/components/events/RouletteBetting";
import { IranWarExecutionDock } from "@/components/events/IranWarExecutionDock";
import { RangeExecutionDock } from "@/components/events/RangeExecutionDock";
import { RangePriceSelector } from "@/components/events/RangePriceSelector";
import { MockOrderBook } from "@/components/events/MockOrderBook";
import { YellowProvider } from "@/lib/yellow/YellowEngine";
import { YellowLogPanel } from "@/components/events/YellowLogPanel";
// Define types for shared state
export type RouletteSelection = {
    selectedEvents: string[];
    selectedOutcome: "yes" | "no" | null;
    selectedDate: number | string | null;
};

// --- Sub-components (Consolidated for Detail View) ---

const StepChart = () => {
    const data = [
        { time: 0, val: 72 },
        { time: 10, val: 72 },
        { time: 10, val: 75 },
        { time: 25, val: 75 },
        { time: 25, val: 74 },
        { time: 40, val: 74 },
        { time: 40, val: 80 },
        { time: 60, val: 80 },
        { time: 60, val: 78 },
        { time: 85, val: 78 },
        { time: 85, val: 81 },
        { time: 100, val: 81 },
    ];

    const generatePath = () => data.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.time}% ${100 - point.val}%`).join(' ');
    const generateFillPath = () => `${generatePath()} L 100% 100% L 0% 100% Z`;

    return (
        <div className="w-full h-96 bg-white border border-border-default relative overflow-hidden p-8 group">
            <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
            <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D97E" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#00D97E" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map(val => (
                    <line key={val} x1="0" y1={`${val}%`} x2="100%" y2={`${val}%`} stroke="#E5E5E5" strokeWidth="0.5" />
                ))}
                <motion.path d={generateFillPath()} fill="url(#chart-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }} />
                <motion.path d={generatePath()} stroke="#00D97E" strokeWidth="2" fill="none" className="step-chart-path" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
                <g style={{ transform: 'translateX(40%) translateY(20%)' }}>
                    <line x1="0" y1="0" x2="0" y2="40" stroke="#059669" strokeWidth="1" strokeDasharray="2 2" />
                    <rect x="-4" y="-20" width="80" height="20" fill="white" stroke="#059669" strokeWidth="1" rx="2" />
                    <text x="4" y="-7" fontSize="8" fontWeight="bold" fill="#059669" className="uppercase tracking-tighter">SEC Filing Update</text>
                </g>
            </svg>
            <div className="absolute bottom-4 left-8 right-8 flex justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-body">Dec 01 2025</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-body">Dec 31 2025</span>
            </div>
        </div>
    );
};


const ExecutionDock = ({ marketTitle }: { marketTitle: string }) => {
    const [side, setSide] = useState<"YES" | "NO">("YES");
    const [amount, setAmount] = useState<string>("100");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => setIsSubmitting(false), 2500);
    };

    return (
        <div className="sticky top-24 w-full bg-white border border-border-default rounded-xl p-8 shadow-crisp space-y-8">
            <div className="flex border-b border-border-default">
                {["Buy", "Sell", "Liquidity"].map((tab) => (
                    <button key={tab} className={cn("flex-1 pb-4 text-[10px] font-black uppercase tracking-widest transition-colors relative", tab === "Buy" ? "text-text-hero" : "text-text-body")}>
                        {tab}
                        {tab === "Buy" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent-green" />}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-canvas rounded-lg">
                <button onClick={() => setSide("YES")} className={cn("py-3 rounded-md text-xs font-black uppercase tracking-[0.2em] transition-all", side === "YES" ? "bg-accent-green text-white shadow-lg shadow-green/20" : "text-text-body hover:bg-white")}>Yes</button>
                <button onClick={() => setSide("NO")} className={cn("py-3 rounded-md text-xs font-black uppercase tracking-[0.2em] transition-all", side === "NO" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-text-body hover:bg-white")}>No</button>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-text-body">Invest Amount</label><span className="text-[10px] font-bold text-text-body">Balance: 12,402 USDC</span></div>
                <div className="relative group">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-canvas border border-border-default h-16 px-6 pt-2 text-2xl font-black text-text-hero focus:outline-none focus:border-accent-green transition-colors" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-text-body">USDC</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {["100", "500", "1k", "Max"].map((val) => (
                        <button key={val} onClick={() => setAmount(val.replace('k', '000').replace('Max', '12402'))} className="py-2 bg-canvas border border-border-default text-[10px] font-black uppercase hover:bg-white transition-colors">{val}</button>
                    ))}
                </div>
            </div>
            <div className="p-6 bg-canvas space-y-3 rounded-lg border border-border-default/50">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-text-body">Avg Price</span><span className="text-text-hero">78.2 ¢</span></div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-text-body">Est. Payout</span><span className="text-text-hero font-black text-accent-green-deep">$1,280.40</span></div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-text-body">Market ROI</span><span className="text-accent-green-deep font-black">+28.4%</span></div>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting} className={cn("w-full h-16 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden", side === "YES" ? "bg-accent-green text-white hover:bg-accent-green-deep" : "bg-red-500 text-white hover:bg-red-600", isSubmitting && "opacity-90 scale-[0.98]")}>
                <span className={cn(isSubmitting ? "opacity-0" : "opacity-100")}>Submit Order</span>
                {isSubmitting && <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute top-0 bottom-0 left-0 w-1/3 bg-white/20 skew-x-12" />}
            </button>
            <p className="text-center text-[9px] font-bold text-[#9CA3AF] leading-relaxed">Funds are locked in the prediction contract until resolution. By submitting, you agree to Xiphias Lab protocols.</p>
        </div>
    );
};


// --- Page Component ---

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

export default function MarketDetailPage() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [probValue, setProbValue] = useState(0);

    const isPolitics = id?.toString().toLowerCase().includes("election") || id?.toString().toLowerCase().includes("pol") || id?.toString().includes("ny-06") || id === "iranwar";
    const isNY06 = id === "ny-06-democratic-primary-winner" || id === "iranwar" || id === "election";
    const isElection = id === "election";
    const isXRP = id?.toString().includes("xrp");

    // Lifted State for Roulette
    const [rouletteChoice, setRouletteChoice] = useState<RouletteSelection>({
        selectedEvents: isElection ? ["winner"] : ["on"],
        selectedOutcome: null,
        selectedDate: null
    });

    const candidates = [
        "JD Vance",
        "Gavin Newsom",
        "Marco Rubio",
        "Alexandria Ocasio-Cortez",
        "Kamala Harris",
        "Josh Shapiro",
        "Donald Trump",
        "Pete Buttigieg",
        "Andy Beshear",
        "JB Pritzker",
        "Ron DeSantis",
        "Dwayne 'The Rock' Johnson",
        "Wes Moore",
        "Ivanka Trump",
        "Elon Musk",
        "Gretchen Whitmer",
        "Donald Trump Jr.",
        "Vivek Ramaswamy",
        "LeBron James",
        "Glenn Youngkin",
        "Tucker Carlson",
        "Nikki Haley",
        "Tim Walz",
        "Tulsi Gabbard",
        "Jamie Dimon",
        "Kim Kardashian",
        "Zohran Mamdani",
        "Michelle Obama",
        "Greg Abbott",
        "Stephen A. Smith",
        "Jon Stewart",
        "Mark Kelly",
        "Rahm Emanuel",
        "Marjorie Taylor Greene",
        "Ted Cruz"
    ];

    const [customRange, setCustomRange] = useState({ min: 2.60, max: 2.80, prob: 0.15 });

    const ny06Outcomes = [
        { id: "meng", name: "US strikes Iran by...?", probability: 72, color: "#10B981", image: "/market/iranusa.png" },
        { id: "park", name: "US strikes Iran on..?", probability: 18, color: "#3B82F6", image: "/market/iranusa_2.png" },
        { id: "xiong", name: "Other Scenarios", probability: 10, color: "#F59E0B", image: "/market/iranwar.png" },
    ];

    const xrpPricePoints = [
        { price: 2.50, probabilityAbove: 0.95 },
        { price: 2.60, probabilityAbove: 0.85 },
        { price: 2.70, probabilityAbove: 0.65 },
        { price: 2.80, probabilityAbove: 0.45 },
        { price: 2.90, probabilityAbove: 0.25 },
        { price: 3.00, probabilityAbove: 0.10 },
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
        <YellowProvider>
        <main className={cn("min-h-screen uppercase", isNY06 ? "bg-white" : "bg-canvas dot-grid pt-16")}>
            <GlobalHeader />

            <div className={cn("max-w-7xl mx-auto px-8 pb-32", isNY06 ? "pt-6" : "pt-12")}>
                {/* HEADER CONTEXT */}
                <div className={cn("flex items-start justify-between", isNY06 ? "mb-4" : "mb-12")}>
                    <div className="space-y-4">
                        <nav className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8]">
                            <span>Markets</span>
                            <span className="text-accent-green">/</span>
                            <span>{isPolitics ? "Politics" : "Crypto"}</span>
                            <span className="text-accent-green">/</span>
                            <span className="text-text-hero">Current Order</span>
                        </nav>
                        <h1 className={cn("text-6xl font-black text-text-hero tracking-tighter leading-none flex gap-3", (isPolitics || isNY06) ? "font-serif" : "font-sans")}>
                            {isElection ? "2028 U.S." : isNY06 ? "Iran" : isXRP ? "XRP Price" : "Ethereum Spot ETF"}
                            <span className="text-accent-green-deep">{isElection ? "Election" : isNY06 ? "War" : isXRP ? "Custom Range" : "Approval Path"}</span>
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

                {isNY06 && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start mb-12">
                        <div className="flex flex-col">
                            <RouletteBetting
                                selection={rouletteChoice}
                                onSelectionChange={setRouletteChoice}
                                customItems={isElection ? candidates : undefined}
                                marketType={isElection ? "election" : "iran"}
                            />
                            <MockOrderBook />
                        </div>
                        <div className="pt-6">
                            <IranWarExecutionDock
                                selection={rouletteChoice}
                            />
                        </div>
                    </div>
                )}

                {/* MAIN COCKPIT */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
                    <div className="space-y-12">
                        {isNY06 ? (
                            null
                        ) : isXRP ? (
                            <RangePriceSelector
                                pricePoints={xrpPricePoints}
                                onRangeChange={(min, max, prob) => setCustomRange({ min, max, prob })}
                            />
                        ) : (
                            <StepChart />
                        )}
                    </div>
                    {isNY06 ? (
                        <div className="space-y-6">
                            <IranWarExecutionDock selection={rouletteChoice} />
                            <YellowLogPanel />
                        </div>
                    ) : (
                        isXRP ? (
                            <RangeExecutionDock
                                eventTitle="XRP Price Window"
                                minPrice={customRange.min}
                                maxPrice={customRange.max}
                                probability={customRange.prob}
                            />
                        ) : (
                            <ExecutionDock marketTitle="Ethereum Spot ETF" />
                        )
                    )}
                </div>

            </div>

        </main>
        </YellowProvider>
    );
}
