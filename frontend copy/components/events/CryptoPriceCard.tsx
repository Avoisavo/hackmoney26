"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CryptoItem {
    name: string;
    icon: string;
    odds: string;
    multiplier: string;
    slug: string;
}

interface CryptoPriceCardProps {
    className?: string;
}

const CRYPTO_LIST: CryptoItem[] = [
    {
        name: "Bitcoin",
        icon: "/market/bitcoin.png",
        odds: "42%",
        multiplier: "2.38x",
        slug: "bitcoin-price"
    },
    {
        name: "Ethereum",
        icon: "/market/ethereum.png",
        odds: "35%",
        multiplier: "2.86x",
        slug: "ethereum-price"
    },
    {
        name: "UNI",
        icon: "/market/uni.png",
        odds: "23%",
        multiplier: "4.35x",
        slug: "uni-price"
    }
];

export const CryptoPriceCard = ({ className }: CryptoPriceCardProps) => {
    return (
        <div className={cn(
            "bg-white border border-gray-200 rounded-xl overflow-hidden",
            className
        )}>
            {/* Header with Big Title */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F7931A] to-[#FF6B00] flex items-center justify-center">
                        <span className="text-white text-xl">₿</span>
                    </div>
                    <h2 className="text-2xl font-black text-black leading-tight">
                        What price will <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7931A] via-[#627EEA] to-[#FF007A]">___</span> hit?
                    </h2>
                </div>
            </div>

            {/* Crypto Sub-list */}
            <div className="px-6 pb-6 space-y-3">
                {CRYPTO_LIST.map((crypto) => (
                    <Link
                        key={crypto.slug}
                        href={`/markets/${crypto.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image
                                    src={crypto.icon}
                                    alt={crypto.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <span className="font-bold text-lg text-black group-hover:text-[#00C896] transition-colors">
                                {crypto.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500">{crypto.multiplier}</span>
                            <span className={cn(
                                "px-4 py-2 rounded-full text-sm font-bold border-2",
                                crypto.name === "Bitcoin" && "border-[#F7931A] text-[#F7931A]",
                                crypto.name === "Ethereum" && "border-[#627EEA] text-[#627EEA]",
                                crypto.name === "UNI" && "border-[#FF007A] text-[#FF007A]"
                            )}>
                                {crypto.odds}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-4 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-medium text-gray-500">$24.5M vol</span>
                <span className="text-sm font-medium text-gray-500">3 markets</span>
            </div>
        </div>
    );
};
