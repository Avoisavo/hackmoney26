"use client";

import React, { useState, useEffect } from "react";
import { YellowProvider, useYellow } from "./YellowEngine";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import {
  Terminal,
  Activity,
  Loader2,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

export default function YellowUltimatePage() {
  return (
    <YellowProvider>
      <YellowUltimateContent />
    </YellowProvider>
  );
}

function YellowUltimateContent() {
  const { messages, connected, authenticated, channelStatus, session } =
    useYellow();

  return (
    <main className="min-h-screen bg-canvas pt-20">
      <GlobalHeader />

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-text-hero tracking-tighter uppercase mb-2">
              Yellow <span className="text-accent-green">Ultimate</span> Flow
            </h1>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">
              Off-chain Trading Sandbox / Nitrolite v0.5.3
            </p>
          </div>

          <div className="flex gap-4">
            <StatusBadge
              label="Socket"
              active={connected}
              color="bg-blue-500"
            />
            <StatusBadge
              label="Auth"
              active={authenticated}
              color="bg-yellow-500"
            />
            <StatusBadge
              label="Channel"
              active={channelStatus !== "none"}
              color="bg-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1 border border-border-default h-fit">
            <YellowTradeInfoMerged />

            <div className="bg-white border-t border-border-default p-6 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-hero flex items-center gap-2 text-black">
                <Activity className="w-3 h-3 text-accent-green" />
                Session Metadata
              </h3>
              <div className="space-y-3">
                <MetaRow
                  label="Channel ID"
                  value={session.id || "Not Anchored"}
                  truncate
                />
                <MetaRow label="Version" value={String(session.version)} />
                <MetaRow
                  label="Allocations"
                  value={String(session.allocations?.length || 0)}
                />
              </div>
            </div>
          </div>

          {/* Log Terminal */}
          <div className="lg:col-span-2 flex flex-col h-[700px]">
            <div className="bg-gray-900 rounded-t-xl p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2 text-white/50">
                <Terminal className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Live ClearNode Logs
                </span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
            </div>

            <div className="flex-1 bg-black p-6 font-mono text-[11px] overflow-y-auto space-y-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-[0.3em] text-[10px]">
                  Waiting for first event...
                </div>
              ) : (
                messages.map((msg, idx) => <LogEntry key={idx} msg={msg} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function YellowTradeInfoMerged() {
  const { address } = useAccount();
  const {
    connected,
    authenticated,
    connecting,
    channelStatus,
    connect,
    anchor,
    trade,
    cashout,
    ledgerBalances,
    session,
    vaultBalance,
    buyShares,
    isAutoInitializating,
    ensureActiveSession,
    deposit,
    withdraw,
  } = useYellow();

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showingQuote, setShowingQuote] = useState(false);

  const yUsdBalance =
    ledgerBalances["ytest.usd"] || ledgerBalances["yUSD"] || "0.00";
  const yesBalance =
    ledgerBalances["YES"] || ledgerBalances["YES-shares"] || "0.00";

  useEffect(() => {
    if (
      lastAction === "settle" &&
      channelStatus === "none" &&
      !isActionLoading
    ) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [channelStatus, isActionLoading, lastAction]);

  useEffect(() => {
    setIsActionLoading(false);
    setLastAction(null);
  }, [session.version]);

  const handleAction = async (name: string, fn: () => Promise<void>) => {
    setIsActionLoading(true);
    setLastAction(name);
    try {
      await fn();
    } finally {
      if (name !== "settle" && name !== "deposit" && name !== "withdraw") {
        setIsActionLoading(false);
        setLastAction(null);
      } else {
        // Keep loading for a bit for transition
        setTimeout(
          () => {
            setIsActionLoading(false);
            setLastAction(null);
          },
          name === "settle" ? 8000 : 3000,
        );
      }
    }
  };

  if (!address) return null;

  return (
    <div className="bg-white p-6 space-y-6 relative overflow-hidden text-black">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111827]">
              Yellow Cloud
            </h3>
            <p className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider">
              Vault ID: {address.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all",
            authenticated
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500",
          )}
        >
          <ShieldCheck className="w-3 h-3" />
          {authenticated ? "Session Active" : "Auth Required"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]/50 space-y-1">
          <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider">
            L2 Wallet (yUSD)
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#111827] tracking-tighter tabular-nums">
              {parseFloat(yUsdBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
        <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]/50 space-y-1">
          <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider">
            YES Shares
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#111827] tracking-tighter tabular-nums">
              {parseFloat(yesBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[8px] font-black text-accent-green uppercase tracking-widest">
              Owned
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-green-700">
                Settlement Complete
              </p>
              <p className="text-[8px] font-bold text-green-600">
                Balance secured on Sepolia L1
              </p>
            </div>
          </div>
        )}

        {showingQuote ? (
          <div className="bg-gray-50 border border-border-default rounded-xl p-5 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#111827]">
                Review Quote
              </h4>
              <button
                onClick={() => setShowingQuote(false)}
                className="text-[10px] text-gray-400 hover:text-black uppercase font-bold"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 font-bold uppercase">Pay</span>
                <span className="font-black text-black">85.00 yUSD</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 font-bold uppercase">
                  Receive
                </span>
                <span className="font-black text-accent-green">100 YES</span>
              </div>
            </div>
            <button
              onClick={() => {
                setShowingQuote(false);
                handleAction("buy", () => buyShares("100", "85"));
              }}
              disabled={isActionLoading}
              className="w-full py-3 bg-accent-green text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Purchase"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setShowingQuote(true)}
              disabled={isAutoInitializating || isActionLoading}
              className="w-full py-5 bg-black text-white text-[13px] font-black uppercase tracking-[0.3em] rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-1 shadow-xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10 flex items-center gap-2">
                {isAutoInitializating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Initializing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    Buy 100 YES Shares
                  </>
                )}
              </span>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">
                85.00 yUSD • Instant Settlement
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction("settle", cashout)}
                disabled={isActionLoading || channelStatus === "none"}
                className="py-3 border border-border-default text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-black"
              >
                {isActionLoading && lastAction === "settle" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Settle (L1 Cashout)"
                )}
              </button>
              <button
                onClick={() => handleAction("withdraw", () => withdraw("50"))}
                disabled={isActionLoading}
                className="py-3 border border-border-default text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-black"
              >
                {isActionLoading && lastAction === "withdraw" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "L1 Withdraw"
                )}
              </button>
            </div>

            <button
              onClick={() => handleAction("deposit", () => deposit("100"))}
              className="w-full py-2 text-[8px] font-black uppercase text-gray-400 hover:text-black tracking-[0.2em] transition-colors"
            >
              Add Test Funds (Deposit 100 yUSD to Vault)
            </button>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#E5E7EB]/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-bold uppercase text-[#6B7280] tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Nitro Status
          </div>
          <div
            className={cn(
              "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest transition-all",
              channelStatus === "funded"
                ? "text-[#059669] bg-green-50"
                : channelStatus === "open"
                  ? "text-blue-600 bg-blue-50"
                  : channelStatus === "opening"
                    ? "text-yellow-600 bg-yellow-50 animate-pulse"
                    : "text-gray-400 bg-gray-50",
            )}
          >
            {channelStatus === "funded"
              ? "Live & Ready"
              : channelStatus === "open"
                ? "Channel Open"
                : channelStatus === "opening"
                  ? "Syncing L1..."
                  : "Idle"}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  active,
  color,
}: {
  label: string;
  active: boolean;
  color: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
        active
          ? `bg-white ${color.replace("bg-", "border-")}/30 text-text-hero shadow-sm text-black`
          : "bg-gray-100 border-gray-200 text-gray-400",
      )}
    >
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? color : "bg-gray-300",
        )}
      />
      {label}
    </div>
  );
}

function MetaRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-text-secondary uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-[10px] font-black text-text-hero uppercase tracking-tighter text-black",
          truncate && "max-w-[120px] truncate",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function LogEntry({ msg }: { msg: any }) {
  const isError = msg.type === "error";
  const isInfo = msg.type === "info";
  const isSent = msg.type === "sent";
  const isReceived = msg.type === "received";

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300 border-l border-white/5 pl-4 ml-1">
      <div className="flex items-start gap-4">
        <span className="text-white/30 shrink-0 tabular-nums">
          [
          {msg.timestamp.toLocaleTimeString([], {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
          ]
        </span>
        <div className="space-y-1 overflow-hidden">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest",
              isError
                ? "bg-red-500/20 text-red-400"
                : isInfo
                  ? "bg-blue-500/40 text-blue-200"
                  : isSent
                    ? "bg-purple-500/30 text-purple-300"
                    : isReceived
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-500/20 text-gray-400",
            )}
          >
            {msg.type}
          </span>
          <p
            className={cn(
              "leading-relaxed break-all font-mono text-[10px]",
              isError
                ? "text-red-300"
                : isSent
                  ? "text-purple-100/60"
                  : isReceived
                    ? "text-emerald-100/60"
                    : "text-white/80",
            )}
          >
            {msg.content}
          </p>
        </div>
      </div>
    </div>
  );
}
