"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const GlobalHeader = () => {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
      {/* Top Row */}
      <div className="h-16 px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-10">
          {/* Logo */}
          {/* Logo */}
          <Link href="/markets" className="text-[#00C896] font-bold text-3xl tracking-tight cursor-pointer">
            Xiphias
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            <Link href="/markets" className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">MARKETS</Link>
            <span className="text-[13px] font-bold text-[#FF4B4B] cursor-pointer hover:opacity-80 transition-opacity">LIVE</span>
            <span className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">SOCIAL</span>
          </nav>
        </div>

        {/* Right Side: Search and Auth */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <div className="relative w-full max-w-[440px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Trade on anything"
              className="w-full h-11 bg-gray-100 border-none rounded-full pl-12 pr-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#00C896] transition-all"
            />
          </div>

          <div className="ml-2">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="h-11 px-6 bg-[#00C896] hover:bg-[#00B085] text-white text-[13px] font-bold rounded-full transition-all shadow-sm"
                          >
                            CONNECT WALLET
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="h-11 px-6 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-full transition-all shadow-sm"
                          >
                            Wrong network
                          </button>
                        );
                      }

                      return (
                        <div className="flex gap-3">
                          <button
                            onClick={openChainModal}
                            style={{ display: 'flex', alignItems: 'center' }}
                            type="button"
                            className="h-11 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[13px] font-bold rounded-full transition-all"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </button>

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="h-11 px-4 bg-[#00C896] hover:bg-[#00B085] text-white text-[13px] font-bold rounded-full transition-all shadow-sm"
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="h-11 px-6 border-t border-gray-50 flex items-center gap-7 overflow-x-auto no-scrollbar">
        <CategoryItem label="Trending" />
        <CategoryItem label="Politics" active />
        <CategoryItem label="Sports" />
        <CategoryItem label="Culture" />
        <CategoryItem label="Crypto" />
        <CategoryItem label="Climate" />
        <CategoryItem label="Economics" />
        <CategoryItem label="Mentions" />
        <CategoryItem label="Companies" />
        <CategoryItem label="Financials" />
        <CategoryItem label="Tech & Science" />
      </div>
    </header>
  );
};

const CategoryItem = ({ label, active = false }: { label: string, active?: boolean }) => (
  <span className={cn(
    "text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors h-full flex items-center border-b-2 border-transparent",
    active ? "text-gray-900 font-bold border-gray-900" : "text-gray-500 hover:text-gray-900"
  )}>
    {label}
  </span>
);
