"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePublicClient } from "wagmi";
import { useEnsText } from "@/lib/ens";
import { YellowContext } from "@/lib/yellow/YellowEngine";
import { ENS_CHAIN_ID } from "@/lib/networkConfig";

const EnsWalletButton = ({ account, openAccountModal }: { account: any; openAccountModal: () => void }) => {
  const [ensName, setEnsName] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: ENS_CHAIN_ID });

  const shortAddress = account.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : '';

  // Look up ENS name on Sepolia
  useEffect(() => {
    const lookup = async () => {
      if (account.address && publicClient) {
        try {
          const name = await publicClient.getEnsName({ address: account.address });
          setEnsName(name || null);
        } catch {
          setEnsName(null);
        }
      }
    };
    lookup();
  }, [account.address, publicClient]);

  // Listen for ens-registered event from the ENS page for instant updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name) {
        setEnsName(detail.name);
      }
    };
    window.addEventListener("ens-registered", handler);
    return () => window.removeEventListener("ens-registered", handler);
  }, []);

  // Fetch avatar from Sepolia resolver
  const { data: ensAvatar } = useEnsText(ensName, "avatar");

  const hasEns = !!ensName;

  return (
    <button
      onClick={openAccountModal}
      type="button"
      className="h-11 px-4 bg-[#00C896] hover:bg-[#00B085] text-white text-[13px] font-bold rounded-full transition-all shadow-sm flex items-center gap-2.5"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
        {hasEns && ensAvatar ? (
          <img src={ensAvatar} alt={ensName ?? ""} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-white/70" />
        )}
      </div>
      {/* Name & Address */}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[13px] font-bold">
          {hasEns ? ensName : "Not Available"}
        </span>
        <span className="text-[10px] opacity-75">{shortAddress}</span>
      </div>
    </button>
  );
};

function YellowBalanceDisplay() {
  const yellowContext = useContext(YellowContext);
  
  // If not inside YellowProvider, show N/A
  if (!yellowContext) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-full">
        <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
        <span className="text-[12px] font-bold text-yellow-400">N/A</span>
      </div>
    );
  }
  
  const { ledgerBalance, isAuthenticated, wsStatus } = yellowContext;
  
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toFixed(2);
  };
  
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-full">
      <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
      <span className="text-[12px] font-bold text-yellow-700">
        {wsStatus !== "Connected" ? (
          <span className="text-yellow-400">N/A</span>
        ) : isAuthenticated ? (
          <>{formatBalance(ledgerBalance)} <span className="text-[10px] text-yellow-500">yUSD</span></>
        ) : (
          <span className="text-yellow-400 animate-pulse">...</span>
        )}
      </span>
    </div>
  );
}
export const GlobalHeader = () => {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
      {/* Top Row */}
      <div className="h-16 px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/markets" className="cursor-pointer flex-shrink-0">
            <Image
              src="/logo/xiphiaslogo123.png"
              alt="Xiphias"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            <Link href="/markets" className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">MARKETS</Link>
            <span className="text-[13px] font-bold text-[#FF4B4B] cursor-pointer hover:opacity-80 transition-opacity">LIVE</span>
            <Link href="/ens" className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#00C896] transition-colors">ENS</Link>
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
                        <div className="flex gap-3 items-center">
                          <YellowBalanceDisplay />
                          {account.displayBalance && (
                            <div className="h-11 px-5 bg-gray-100 text-gray-900 text-[13px] font-bold rounded-full flex items-center gap-1.5">
                              <span>{account.displayBalance}</span>
                            </div>
                          )}

                          <EnsWalletButton account={account} openAccountModal={openAccountModal} />
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
