"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CultureItem {
    name: string;
    icon: string;
    odds: string;
    multiplier: string;
    slug: string;
}

interface CultureCardProps {
    className?: string;
}

const CULTURE_LIST: CultureItem[] = [
    {
        name: "Will Jesus Christ return before 2027?",
        icon: "/market/jesus.png",
        odds: "2%",
        multiplier: "50.0x",
        slug: "jesus-return-2027"
    },
    {
        name: "Jesus #1 in news 2026",
        icon: "/market/jesus2.png",
        odds: "15%",
        multiplier: "6.67x",
        slug: "jesus-news-2026"
    },
    {
        name: "Jesus TikTok revival",
        icon: "/market/jesus3.png",
        odds: "28%",
        multiplier: "3.57x",
        slug: "jesus-tiktok-revival"
    }
];

export const CultureCard = ({ className }: CultureCardProps) => {
    return (
        <div className={cn(
            "bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full",
            className
        )}>
            {/* Header with Big Title */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFB800] to-[#FF8A00] flex items-center justify-center overflow-hidden">
                        <Image
                            src="/market/jesus.png"
                            alt="Jesus"
                            width={48}
                            height={48}
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                    <h2 className="text-2xl font-black text-black leading-tight uppercase">
                        The return of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB800] to-[#FF8A00]">jesus christ</span>
                    </h2>
                </div>
            </div>

            {/* Culture Sub-list */}
            <div className="px-6 pb-6 space-y-3 flex-1">
                {CULTURE_LIST.map((item) => (
                    <Link
                        key={item.slug}
                        href={`/markets/${item.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image
                                    src={item.icon}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <span className="font-bold text-lg text-black group-hover:text-[#00C896] transition-colors">
                                {item.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500">{item.multiplier}</span>
                            <span className="px-4 py-2 rounded-full text-sm font-bold border-2 border-[#FFB800] text-[#FF8A00]">
                                {item.odds}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-4 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-medium text-gray-500">$1.2M vol</span>
                <span className="text-sm font-medium text-gray-500">1 market</span>
            </div>
        </div>
    );
};
