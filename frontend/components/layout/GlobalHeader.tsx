"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient } from "wagmi";
import { useEnsText } from "@/lib/ens";

export const GlobalHeader = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [headerEnsName, setHeaderEnsName] = React.useState<string | null>(null);
  const [headerEnsAvatar, setHeaderEnsAvatar] = React.useState<string | null>(null);

  // Use the useEnsText hook to read avatar text record from resolver
  const { data: resolverAvatar } = useEnsText(headerEnsName, 'avatar');

  // Sync resolver avatar to state
  React.useEffect(() => {
    if (resolverAvatar && resolverAvatar !== headerEnsAvatar) {
      setHeaderEnsAvatar(resolverAvatar);
    }
  }, [resolverAvatar, headerEnsAvatar]);

  React.useEffect(() => {
    const lookupName = async () => {
      if (address && publicClient) {
        try {
          const name = await publicClient.getEnsName({ address });
          setHeaderEnsName(name);
        } catch (e) {
          console.error("Header ENS lookup error:", e);
        }
      } else {
        setHeaderEnsName(null);
      }
    };
    lookupName();

    // Refresh every 10 seconds if we are on the /ens page to catch updates
    const interval = setInterval(lookupName, 10000);

    const handleRegistered = (e: any) => {
      if (e.detail?.name) {
        setHeaderEnsName(e.detail.name);
      }
      if (e.detail?.avatar) {
        setHeaderEnsAvatar(e.detail.avatar);
      }
    };
    window.addEventListener("ens-registered", handleRegistered);

    return () => {
      clearInterval(interval);
      window.removeEventListener("ens-registered", handleRegistered);
    };
  }, [address, publicClient]);

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
                          {account.displayBalance && (
                            <div className="px-4 py-2 bg-gray-100 rounded-full">
                              <span className="text-[13px] font-bold text-gray-900">
                                {account.displayBalance}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="h-auto py-1.5 pl-2 pr-5 bg-[#00C896] hover:bg-[#00B085] text-white rounded-2xl transition-all shadow-sm flex items-center gap-3 overflow-hidden"
                          >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                              {headerEnsAvatar ? (
                                <img src={headerEnsAvatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                (headerEnsName || account.address)[headerEnsName ? 0 : 2].toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold leading-none">
                                  {headerEnsName || "Not Available"}
                                </span>
                                {headerEnsName && (
                                  <span className="px-1.5 py-0.5 bg-white/20 text-[8px] font-black uppercase rounded-full tracking-wider leading-none">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono opacity-80 leading-none">
                                {account.address}
                              </span>
                            </div>
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
