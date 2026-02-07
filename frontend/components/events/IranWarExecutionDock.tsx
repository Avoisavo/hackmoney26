"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

import { RouletteSelection } from "@/app/iran/page";
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
        if (!selection || selection.selectedCells.length === 0) return null;

        const selectedOutcome = selection.selectedOutcome || "yes";
        const positions: any[] = [];

        // Flatten selections: each cell * each selected event
        selection.selectedCells.forEach(cell => {
            selection.selectedEvents.forEach(evt => {
                const market = iranData.markets.find(m => evt === "on" ? m.type === "on_date" : m.type === "by_date");
                if (!market) return;

                const price = cell.cents / 100;
                const stake = investAmount / (selection.selectedCells.length * selection.selectedEvents.length);
                const shares = price > 0 ? stake / price : 0;

                positions.push({
                    type: evt,
                    target: cell.day,
                    outcome: selectedOutcome,
                    price,
                    stake,
                    shares,
                    getPayout: (outcomeDate: number | "never") => {
                        if (selectedOutcome === "yes") {
                            if (evt === "on") return outcomeDate === cell.day ? shares : 0;
                            return (outcomeDate !== "never" && outcomeDate <= cell.day) ? shares : 0;
                        } else {
                            if (evt === "on") return outcomeDate !== cell.day ? shares : 0;
                            return (outcomeDate === "never" || outcomeDate > cell.day) ? shares : 0;
                        }
                    }
                });
            });
        });

        if (positions.length === 0) return null;

        // Scenarios for resolution table
        // We'll use a standard range of outcomes to test the aggregate position
        const testDates = [1, 5, 10, 15, 20, 25, 28, "never"];
        const rows = testDates.map(dateVal => {
            const label = dateVal === "never" ? "Never" : `${dateVal} Feb`;
            const totalPayout = positions.reduce((acc, pos) => acc + pos.getPayout(dateVal), 0);
            const profit = totalPayout - investAmount;
            return { label, totalPayout, profit };
        });

        return { activeBets: positions, rows };
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
