"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface IranWarExecutionDockProps {
    className?: string;
}

export const IranWarExecutionDock = ({ className }: IranWarExecutionDockProps) => {
    const [mode, setMode] = useState<"buy" | "sell">("buy");
    const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
    const [amount, setAmount] = useState<string>("1");
    const [currency, setCurrency] = useState("Dollars");

    return (
        <div className={cn("w-full bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-6", className)}>
            {/* Header: Market Info */}
            <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img src="/market/iranwar.png" alt="Iran War" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                        Iran War: US strike status?
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-bold text-[#3B82F6]">Buy Yes</span>
                        <span className="text-gray-400">·</span>
                        <span className="font-bold text-gray-900">Atomic Bundle</span>
                    </div>
                </div>
            </div>

            {/* Tabs: Buy/Sell & Currency */}
            <div className="flex items-center justify-between">
                <div className="flex bg-gray-50 p-1 rounded-full border border-gray-100">
                    <button
                        onClick={() => setMode("buy")}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-bold transition-all",
                            mode === "buy" ? "bg-white text-[#10B981] shadow-sm" : "text-gray-500"
                        )}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setMode("sell")}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-bold transition-all",
                            mode === "sell" ? "bg-white text-red-500 shadow-sm" : "text-gray-500"
                        )}
                    >
                        Sell
                    </button>
                </div>
                <button className="flex items-center gap-2 text-sm font-bold text-gray-900 pr-2">
                    {currency} <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {/* Large Yes/No Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setSelectedOutcome("yes")}
                    className={cn(
                        "h-14 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all",
                        selectedOutcome === "yes"
                            ? "border-[#10B981] bg-[#10B981]/5 text-[#10B981]"
                            : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                >
                    <span className="font-bold">Yes</span>
                    <span className="font-medium text-lg">72¢</span>
                </button>
                <button
                    onClick={() => setSelectedOutcome("no")}
                    className={cn(
                        "h-14 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all",
                        selectedOutcome === "no"
                            ? "border-[#FF4B4B] bg-[#FF4B4B]/5 text-[#FF4B4B]"
                            : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                >
                    <span className="font-bold">No</span>
                    <span className="font-medium text-lg">18¢</span>
                </button>
            </div>

            {/* Amount Input */}
            <div className="p-4 rounded-2xl border-2 border-[#10B981]/30 bg-white relative">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-gray-900">Amount</span>
                    <button className="text-[13px] font-bold text-[#10B981] text-left">
                        Earn 3.25% Interest
                    </button>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-3xl font-bold text-gray-900">$</span>
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-16 text-4xl font-bold text-gray-900 focus:outline-none bg-transparent"
                    />
                </div>
            </div>

            {/* Odds & Payout */}
            <div className="space-y-4 px-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-400">Odds</span>
                    <span className="font-bold text-gray-900">72% chance</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-400">Payout if Yes</span>
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </div>
                    </div>
                    <span className="text-4xl font-bold text-[#10B981]">$2</span>
                </div>
            </div>

            {/* Primary Action Button */}
            <button className="w-full h-16 rounded-[20px] bg-[#10B981] hover:bg-[#0ea876] transition-colors text-white font-bold text-lg uppercase tracking-widest">
                Place bet
            </button>
        </div>
    );
};
