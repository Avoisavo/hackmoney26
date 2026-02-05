"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MarketItem {
    name: string;
    icon: string;
    odds: string;
    multiplier: string;
    slug: string;
    color: string;
}

interface ElectionCardProps {
    className?: string;
}

const ELECTION_MARKETS: MarketItem[] = [
    {
        name: "General election outcome",
        icon: "/market/usa.png",
        odds: "52%",
        multiplier: "1.92x",
        slug: "2028-presidential-general",
        color: "#3B82F6"
    },
    {
        name: "Democratic nomination",
        icon: "/market/democratic.png",
        odds: "38%",
        multiplier: "2.63x",
        slug: "2028-democratic-nomination",
        color: "#2563EB"
    },
    {
        name: "Republican nomination",
        icon: "/market/republican.png",
        odds: "45%",
        multiplier: "2.22x",
        slug: "2028-republican-nomination",
        color: "#DC2626"
    }
];

export const ElectionCard = ({ className }: ElectionCardProps) => {
    return (
        <div className={cn(
            "bg-white border border-gray-200 rounded-xl overflow-hidden",
            className
        )}>
            {/* Header with Big Title */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#DC2626] flex items-center justify-center overflow-hidden">
                        <span className="text-white text-xl">🇺🇸</span>
                    </div>
                    <Link href="/markets/election" className="group/title">
                        <h2 className="text-2xl font-black text-black leading-tight group-hover/title:text-[#00C896] transition-colors">
                            2028 U.S. Presidential Election
                        </h2>
                    </Link>
                </div>
            </div>

            {/* Election Sub-list */}
            <div className="px-6 pb-6 space-y-3">
                {ELECTION_MARKETS.map((market) => (
                    <Link
                        key={market.slug}
                        href={`/markets/${market.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image
                                    src={market.icon}
                                    alt={market.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <span className="font-bold text-lg text-black group-hover:text-[#00C896] transition-colors">
                                {market.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500">{market.multiplier}</span>
                            <span
                                className="px-4 py-2 rounded-full text-sm font-bold border-2"
                                style={{ borderColor: market.color, color: market.color }}
                            >
                                {market.odds}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-4 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-medium text-gray-500">$156.2M vol</span>
                <span className="text-sm font-medium text-gray-500">3 markets</span>
            </div>
        </div>
    );
};
