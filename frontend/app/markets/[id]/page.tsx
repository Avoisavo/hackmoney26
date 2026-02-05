"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LabHeader, InsightsTicker } from "@/components/shared/SharedUI";
import { cn } from "@/lib/utils";
import { OutcomeHeatmap } from "@/components/events/OutcomeHeatmap";
import { AggregateExecutionDock } from "@/components/events/AggregateExecutionDock";
import { RangePriceSelector } from "@/components/events/RangePriceSelector";
import { RangeExecutionDock } from "@/components/events/RangeExecutionDock";

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

const OrderFlowTape = () => {
    const recentTrades = [
        { id: 1, trader: "0x4B2...2fa", action: "BUY", type: "YES", amt: "5,000", price: "78", time: "2m ago" },
        { id: 2, trader: "0x1E9...d8a", action: "SELL", type: "NO", amt: "12,400", price: "22", time: "5m ago" },
        { id: 3, trader: "0xA8D...1c4", action: "BUY", type: "YES", amt: "2,500", price: "77", time: "8m ago" },
        { id: 4, trader: "0x921...f12", action: "BUY", type: "YES", amt: "15,000", price: "78", time: "12m ago" },
        { id: 5, trader: "0xCC2...e44", action: "SELL", type: "YES", amt: "1,100", price: "79", time: "15m ago" },
    ];
    return (
        <div className="w-full bg-white border border-border-default rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-hero">Recent Market Flow</h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
                </span>
            </div>
            <div className="space-y-4 font-mono">
                {recentTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between text-[10px] border-b border-border-default/50 pb-3">
                        <div className="flex items-center gap-4">
                            <span className="text-text-body">{trade.trader}</span>
                            <span className={trade.type === "YES" ? "text-accent-green-deep font-black" : "text-red-500 font-black"}>{trade.action} {trade.type}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="text-text-hero font-bold">${trade.amt} @ {trade.price}¢</span>
                            <span className="text-[#9CA3AF]">{trade.time}</span>
                        </div>
                    </div>
                ))}
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
            <p className="text-center text-[9px] font-bold text-[#9CA3AF] leading-relaxed">Funds are locked in the prediction contract until resolution. By submitting, you agree to Helix Lab protocols.</p>
        </div>
    );
};

const ThesisSection = () => {
    const bulls = [
        { id: 1, user: "0x8D...2fa", thesis: "SEC commissioners signaled a shift in tone during last private briefing. Likely Q1 approval.", stake: "2,500 USDC" },
        { id: 2, user: "0x1A...d11", thesis: "Correlation with BTC ETF trajectory is 0.94. Market is underpricing the institutional demand.", stake: "1,200 USDC" },
    ];
    const bears = [
        { id: 1, user: "0xCC...e81", thesis: "Staking yields create a complex classification issue that the SEC won't resolve quickly.", stake: "4,000 USDC" },
        { id: 2, user: "0x4F...112", thesis: "Political pressure increases in an election year. Hard no for 2026.", stake: "800 USDC" },
    ];
    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-border-default pt-24 pb-32">
            <div className="space-y-12">
                <div className="flex items-center gap-4"><div className="w-10 h-px bg-accent-green" /><h3 className="text-xl font-black text-text-hero uppercase tracking-tighter">Bull Case Thesis</h3></div>
                <div className="space-y-8">
                    {bulls.map((b) => (
                        <div key={b.id} className="bg-white border-l-2 border-accent-green p-8 shadow-sm">
                            <p className="text-sm font-medium text-text-hero leading-relaxed mb-6 italic">"{b.thesis}"</p>
                            <div className="flex items-center justify-between border-t border-border-default pt-6"><span className="text-[10px] font-black text-text-body uppercase tracking-widest">{b.user}</span><span className="text-[10px] font-black uppercase text-accent-green-deep bg-accent-green-subtle px-3 py-1">Stake: {b.stake}</span></div>
                        </div>
                    ))}
                </div>
                <button className="w-full h-12 border border-dashed border-accent-green text-[10px] font-black uppercase tracking-widest text-accent-green-deep hover:bg-accent-green-subtle transition-colors">Stake to add Bull Thesis +</button>
            </div>
            <div className="space-y-12">
                <div className="flex items-center gap-4"><div className="w-10 h-px bg-red-500" /><h3 className="text-xl font-black text-text-hero uppercase tracking-tighter">Bear Case Thesis</h3></div>
                <div className="space-y-8">
                    {bears.map((b) => (
                        <div key={b.id} className="bg-white border-l-2 border-red-500 p-8 shadow-sm">
                            <p className="text-sm font-medium text-text-hero leading-relaxed mb-6 italic">"{b.thesis}"</p>
                            <div className="flex items-center justify-between border-t border-border-default pt-6"><span className="text-[10px] font-black text-text-body uppercase tracking-widest">{b.user}</span><span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-3 py-1">Stake: {b.stake}</span></div>
                        </div>
                    ))}
                </div>
                <button className="w-full h-12 border border-dashed border-red-500 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors">Stake to add Bear Thesis +</button>
            </div>
        </div>
    );
};

// --- Page Component ---

const LabLoader = () => (
    <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
        <div className="relative">
            <div className="w-16 h-16 border-2 border-accent-green animate-spin" style={{ borderRadius: '2px' }} />
            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter text-accent-green">
                Helix
            </div>
        </div>
    </div>
);

export default function MarketDetailPage() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [probValue, setProbValue] = useState(0);

    const isPolitics = id?.toString().toLowerCase().includes("election") || id?.toString().toLowerCase().includes("pol") || id?.toString().includes("ny-06") || id === "iranwar";
    const isNY06 = id === "ny-06-democratic-primary-winner" || id === "iranwar";
    const isXRP = id?.toString().includes("xrp");

    const [customRange, setCustomRange] = useState({ min: 2.60, max: 2.80, prob: 0.15 });

    const ny06Outcomes = [
        { id: "meng", name: "US strikes Iran by...?", probability: 72, color: "#10B981" },
        { id: "park", name: "US strikes Iran on..?", probability: 18, color: "#3B82F6" },
        { id: "xiong", name: "Other Scenarios", probability: 10, color: "#F59E0B" },
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
        <main className="min-h-screen bg-canvas dot-grid pt-16">
            <title>{isNY06 ? "Iran War" : isXRP ? "XRP Custom Range" : "Ethereum Spot ETF"} | Helix Lab</title>
            <LabHeader />

            <div className="max-w-7xl mx-auto px-8 pt-12 pb-32">
                {/* HEADER CONTEXT */}
                <div className="mb-12 flex items-start justify-between">
                    <div className="space-y-4">
                        <nav className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8]">
                            <span>Markets</span>
                            <span className="text-accent-green">/</span>
                            <span>{isPolitics ? "Politics" : "Crypto"}</span>
                            <span className="text-accent-green">/</span>
                            <span className="text-text-hero">Current Order</span>
                        </nav>
                        <h1 className={cn("text-6xl font-black text-text-hero tracking-tighter leading-none", (isPolitics || isNY06) ? "font-serif" : "font-sans")}>
                            {isNY06 ? "Iran" : isXRP ? "XRP Price" : "Ethereum Spot ETF"} <br />
                            <span className="text-accent-green-deep">{isNY06 ? "War" : isXRP ? "Custom Range" : "Approval Path"}</span>
                        </h1>
                    </div>

                    <div className="text-right space-y-2">
                        <div className="flex items-center gap-4 justify-end">
                            <span className="px-3 py-1 bg-accent-green-subtle text-accent-green-deep text-[10px] font-black uppercase tracking-widest">+4.2% Today</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-body">Market Cap: $84.2M</span>
                        </div>
                        <div className="flex items-end gap-2 justify-end">
                            <span className="text-8xl font-black text-text-hero leading-none tracking-tighter">{probValue}<span className="text-4xl ml-2">%</span></span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-body">Trade Frequency: 14/min</p>
                    </div>
                </div>

                {/* MAIN COCKPIT */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
                    <div className="space-y-12">
                        {isNY06 ? (
                            <OutcomeHeatmap outcomes={ny06Outcomes} />
                        ) : isXRP ? (
                            <RangePriceSelector
                                pricePoints={xrpPricePoints}
                                onRangeChange={(min, max, prob) => setCustomRange({ min, max, prob })}
                            />
                        ) : (
                            <StepChart />
                        )}
                        <OrderFlowTape />
                        <div className="p-12 bg-white border border-border-default rounded-xl space-y-6">
                            <div className="flex items-center gap-4"><span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-green">Context Node</span></div>
                            <p className="text-lg font-bold text-text-hero leading-relaxed">
                                {isNY06
                                    ? "This market resolves to the winner of the Democratic Primary for New York's 6th Congressional District. Aggregated from 30+ separate candidate-specific markets for maximum liquidity."
                                    : isXRP
                                        ? "This market allows you to select any price range for XRP on August 31. Your order is automatically constructed using the optimal combination of binary 'Above' options."
                                        : "This market resolves to \"Yes\" if the SEC approves the S-1 filing for any Ethereum Spot ETF provider on or before the June 10 deadline. Approval is defined as a formal order issued by the commission and posted to their official website."
                                }
                            </p>
                            <div className="flex gap-8 pt-6 border-t border-border-default">
                                <div className="flex flex-col"><span className="text-[9px] font-bold text-text-body uppercase tracking-widest">Resolution Source</span><span className="text-xs font-black text-text-hero uppercase">{isNY06 ? "NY Board of Elections" : isXRP ? "CoinGecko / Binance" : "SEC.gov / Fed Registry"}</span></div>
                                <div className="flex flex-col"><span className="text-[9px] font-bold text-text-body uppercase tracking-widest">Market Status</span><span className="text-xs font-black text-accent-green-deep uppercase">Active Protocol</span></div>
                            </div>
                        </div>
                    </div>
                    {isNY06 ? (
                        <AggregateExecutionDock outcomes={ny06Outcomes} eventTitle="NY-06 Democratic Primary" />
                    ) : isXRP ? (
                        <RangeExecutionDock
                            eventTitle="XRP Price Window"
                            minPrice={customRange.min}
                            maxPrice={customRange.max}
                            probability={customRange.prob}
                        />
                    ) : (
                        <ExecutionDock marketTitle="Ethereum Spot ETF" />
                    )}
                </div>

                <ThesisSection />
            </div>

            <InsightsTicker />
        </main>
    );
}
