"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

import { RouletteSelection } from "@/app/markets/[id]/page";
import iranData from "@/data/iran.json";

interface IranWarExecutionDockProps {
    className?: string;
    selection?: RouletteSelection;
}

export const IranWarExecutionDock = ({ className, selection }: IranWarExecutionDockProps) => {
    const [mode, setMode] = useState<"buy" | "sell">("buy");
    const [amount, setAmount] = useState<string>("100");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Parse amount
    const investAmount = parseFloat(amount.replace(/,/g, '')) || 0;

    // Calculate payouts
    const calculations = React.useMemo(() => {
        if (!selection || !selection.selectedDate || typeof selection.selectedDate !== 'number') return null;

        const targetDate = selection.selectedDate; // e.g. 10
        const selectedOutcome = selection.selectedOutcome || "yes"; // Default to Yes if null

        // Get active markets data for selected EVENTS
        const activeBets = selection.selectedEvents.map(evt => {
            const market = iranData.markets.find(m => evt === "on" ? m.type === "on_date" : m.type === "by_date");
            if (!market) return null;

            const dataPoint = market.data.find(d => parseInt(d.date.split('-')[2], 10) === targetDate);
            if (!dataPoint) return null;

            const priceCents = selectedOutcome === "yes" ? dataPoint.yes_cents : dataPoint.no_cents;
            const price = priceCents / 100;
            // Assuming equal split of investment if multiple selected? Or full investment in each?
            // The prompt image implies independent bets. Let's assume split for now or just $1 each for simplicity of display?
            // "You made 2 bets... Total cost $2".
            // Let's divide investAmount by number of selected events.
            const stake = investAmount / selection.selectedEvents.length;
            const shares = price > 0 ? stake / price : 0;

            return {
                type: evt,
                target: targetDate,
                outcome: selectedOutcome,
                price,
                stake,
                shares,
                // Payout logic
                getPayout: (outcomeDate: number | "never") => {
                    if (selectedOutcome === "yes") {
                        if (evt === "on") {
                            // Pays if outcome exactly matches targetDate
                            return outcomeDate === targetDate ? shares : 0;
                        } else {
                            // "by" -> Pays if outcomeDate <= targetDate (and not never)
                            if (outcomeDate === "never") return 0;
                            return outcomeDate <= targetDate ? shares : 0;
                        }
                    } else {
                        // "no" -> Inverse
                        if (evt === "on") {
                            return outcomeDate !== targetDate ? shares : 0;
                        } else {
                            // "by" -> Pays if outcomeDate !<= targetDate (i.e. > targetDate OR never)
                            if (outcomeDate === "never") return shares;
                            return outcomeDate > targetDate ? shares : 0;
                        }
                    }
                }
            };
        }).filter(Boolean) as any[]; // simple typing for now

        if (activeBets.length === 0) return null;

        // Scenarios for resolution table
        // We want to show ranges relevant to the target
        // e.g. for target 10: 1-(10-1), 10, 11-?, Never
        // Let's create distinct outcome buckets
        const scenarios = [];

        // 1. Before Target (if target > 1)
        if (targetDate > 1) {
            scenarios.push({ label: `1-${targetDate - 1}`, val: 1 }); // just pick representative
        }

        // 2. Exact Target
        scenarios.push({ label: `${targetDate}`, val: targetDate });

        // 3. After Target (if target < 28)
        if (targetDate < 28) {
            scenarios.push({ label: `${targetDate + 1}-28`, val: targetDate + 1 });
        }

        // 4. Never
        scenarios.push({ label: "Never", val: "never" });

        const rows = scenarios.map(scen => {
            const payouts = activeBets.map(bet => bet.getPayout(scen.val));
            const totalPayout = payouts.reduce((a: number, b: number) => a + b, 0); // shares pay $1 each usually? 
            // Wait, standard prediction market shares pay $1. 
            // So payout value = shares * $1 = shares.
            const profit = totalPayout - investAmount;
            return {
                label: scen.label,
                payouts, // array of payout values per bet
                totalPayout,
                profit
            };
        });

        return { activeBets, rows };

    }, [selection, investAmount]);

    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => setIsSubmitting(false), 2500);
    };

    if (!calculations) {
        // Fallback for no selection
        return (
            <div className={cn("w-full bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm space-y-4", className)}>
                <div className="text-center text-gray-400 py-8 text-xs">Select a date on the grid to calculate profit</div>
            </div>
        );
    }

    return (
        <div className={cn("w-full bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold text-base">
                    ∑
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Profit Simulator</h3>
                    <p className="text-[10px] font-bold text-gray-900">Scenario Analysis</p>
                </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <span>Invest Amount</span>
                </div>
                <div className="relative group">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black rounded-lg h-10 px-3 pl-8 text-sm font-bold text-gray-900 transition-all outline-none" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                </div>
            </div>

            {/* Bet Summary */}
            <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Your Position</div>
                {calculations.activeBets.map((bet: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-900">
                            {bet.type === "on_date" ? "ON" : "BY"} {bet.target}
                        </span>
                        <div className="flex gap-2">
                            <span className="text-gray-500">{bet.shares.toFixed(1)} sh</span>
                            <span className="font-mono text-gray-900">@ {bet.price.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between text-[10px] font-bold">
                    <span>Total Cost</span>
                    <span>${investAmount.toFixed(2)}</span>
                </div>
            </div>

            {/* Resolution Table */}
            <div className="space-y-1.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Payouts</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-[10px]">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_1fr_1fr] bg-gray-100 p-1.5 font-bold text-gray-500">
                        <span>Outcome</span>
                        <span className="text-right">Payout</span>
                        <span className="text-right">Profit</span>
                    </div>
                    {/* Rows */}
                    {calculations.rows.map((row: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr] border-t border-gray-100 p-1.5 items-center bg-white">
                            <span className="font-bold text-gray-900">{row.label}</span>
                            <span className="text-right font-mono text-gray-600">${row.totalPayout.toFixed(1)}</span>
                            <span className={cn("text-right font-mono font-bold", row.profit >= 0 ? "text-[#10B981]" : "text-red-500")}>
                                {row.profit >= 0 ? "+" : ""}{row.profit.toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-10 rounded-lg bg-black text-white hover:bg-gray-900 font-bold uppercase tracking-widest text-[10px] transition-all shadow-md">
                {isSubmitting ? "Executing..." : "Place Bets"}
            </button>
        </div>
    );
};
