"use client";

import React from "react";
import Link from "next/link";

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-transform">
                    HackMoney26
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <button
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] hover:scale-105 transition-all duration-300 active:scale-95"
                    onClick={() => console.log("Connect Wallet clicked")}
                >
                    Connect Wallet
                </button>
            </div>
        </header>
    );
};

export default Header;
