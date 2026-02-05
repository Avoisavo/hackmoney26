"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface IranWarCardProps {
    className?: string;
}

export const IranWarCard = ({ className }: IranWarCardProps) => {
    const outcomes = [
        {
            label: "US strikes Iran by...?",
            percentage: "72%",
            multiplier: "1.40x",
            color: "#10B981",
            slug: "iran-war-by"
        },
        {
            label: "US strikes Iran on..?",
            percentage: "28%",
            multiplier: "3.51x",
            color: "#6366F1",
            slug: "iran-war-on"
        }
    ];

    return (
        <div className={cn(
            "bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
            className
        )}>
            {/* Header with Big Title */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF4B4B] to-[#3B82F6] flex items-center justify-center overflow-hidden">
                        <div className="relative w-full h-full">
                            <Image
                                src="/market/iranwar.png"
                                alt="Iran War"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-black leading-tight">
                        Iran War
                    </h2>
                </div>
            </div>

            {/* Outcomes List */}
            <div className="px-6 pb-6 space-y-3">
                {outcomes.map((outcome, idx) => (
                    <Link
                        key={idx}
                        href={`/markets/${outcome.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image
                                    src="/market/iranwar.png"
                                    alt={outcome.label}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <span className="font-bold text-lg text-black group-hover:text-[#00C896] transition-colors">
                                {outcome.label}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500">{outcome.multiplier}</span>
                            <span
                                className="px-4 py-2 rounded-full text-sm font-bold border-2"
                                style={{ borderColor: outcome.color, color: outcome.color }}
                            >
                                {outcome.percentage}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Footer: Volume and Market Count */}
            <div className="border-t border-gray-100 p-4 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-medium text-gray-500">$12.2M vol</span>
                <span className="text-sm font-medium text-gray-500">30 markets</span>
            </div>
        </div>
    );
};
