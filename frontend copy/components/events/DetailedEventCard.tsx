"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PolymarketEvent, detectMarketType } from "@/lib/polymarket";
import { cn } from "@/lib/utils";

interface DetailedEventCardProps {
    event: PolymarketEvent;
    category: string;
    status: 'Active' | 'Resolved';
}

export const DetailedEventCard = ({
    event,
    category,
    status
}: DetailedEventCardProps) => {
    const isNY06 = event.slug === 'ny-06-democratic-primary-winner' || event.title?.toLowerCase().includes("iran war");
    const isElection = event.slug?.includes("election") || event.title?.toLowerCase().includes("presidential election");
    const isGeneral = event.slug?.includes("general") || event.title?.toLowerCase().includes("general election");

    const { title: rawTitle, image: rawImage, volume, markets, slug } = event;
    const title = isNY06 ? "Iran War" : rawTitle;
    const image = isNY06 ? "/market/iranwar.png" : (isElection ? "/market/president.png" : (isGeneral ? "/market/general.png" : rawImage));

    const formattedVolume = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(Number(volume || 0));

    const marketType = detectMarketType(event);
    const outcomesCount = markets?.length || 0;

    // For the detailed view, we usually want to show outcomes from the first market
    // Polymarket "events" often have one primary market with multiple outcomes
    const mainMarket = markets?.[0];

    // Ensure outcomes and prices are treated as arrays (sometimes API returns JSON strings)
    const rawOutcomes = mainMarket?.outcomes || [];
    const rawPrices = mainMarket?.outcomePrices || [];

    const outcomes = Array.isArray(rawOutcomes) ? rawOutcomes : (typeof rawOutcomes === 'string' ? JSON.parse(rawOutcomes) : []);
    const prices = Array.isArray(rawPrices) ? rawPrices : (typeof rawPrices === 'string' ? JSON.parse(rawPrices) : []);

    // Limit to top 2-3 outcomes to match the image style
    const displayedOutcomes = (outcomes || []).slice(0, 2).map((label: any, idx: number) => {
        const price = parseFloat(prices[idx] || "0");
        const percentage = Math.round(price * 100);
        const multiplier = price > 0 ? (1 / price).toFixed(2) : "0.00";

        let displayLabel = label as string;
        if (isNY06) {
            displayLabel = idx === 0 ? "US strikes Iran by...?" : "US strikes Iran on..?";
        }

        return {
            label: displayLabel,
            percentage,
            multiplier,
            image: isNY06 ? (idx === 0 ? "/market/iranusa.png" : "/market/iranusa_2.png") : (idx === 0 ? "/market/warsh_thumb.png" : "/market/shelton_thumb.png")
        };
    });

    return (
        <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <Link href={isNY06 ? `/markets/iranwar` : (slug === 'ny-06-democratic-primary-winner' ? `/markets/${slug}` : `/markets/view/${slug}`)} className="flex flex-col h-full p-6">

                {/* Header: Icon and Title */}
                <div className="flex items-start gap-3 mb-6">
                    <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-gray-100">
                        {image ? (
                            <Image
                                src={image}
                                alt={title}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100" />
                        )}
                    </div>
                    <h3 className="text-[17px] font-bold text-black leading-tight tracking-tight">
                        {title}
                    </h3>
                </div>

                {/* Outcomes List */}
                <div className="flex-1 space-y-4">
                    {displayedOutcomes.map((outcome: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between group/row">
                            <div className="flex items-center gap-3">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-50 border border-gray-100">
                                    {/* Note: Polmarket API doesn't always provide outcome-specific images easily, using placeholder or event image */}
                                    <Image
                                        src={image || "/market/placeholder.png"}
                                        alt={outcome.label}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">
                                    {outcome.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-[13px] font-medium text-gray-400">
                                    {outcome.multiplier}x
                                </span>
                                <div className={cn(
                                    "min-w-[64px] py-1.5 px-3 rounded-full border text-center font-bold text-sm",
                                    idx === 0
                                        ? "border-emerald-400 text-emerald-600 bg-emerald-50/10"
                                        : "border-indigo-400 text-indigo-600 bg-indigo-50/10"
                                )}>
                                    {outcome.percentage}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer: Volume and Market Count */}
                <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between text-gray-400 text-[13px] font-medium">
                    <span>{formattedVolume} vol</span>
                    <span>{outcomesCount} markets</span>
                </div>
            </Link>
        </div>
    );
};
