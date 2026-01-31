"use client";

import React from "react";
import Link from "next/link";

import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-transform">
                    HackMoney26
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <ConnectButton />
            </div>
        </header>
    );
};

export default Header;
