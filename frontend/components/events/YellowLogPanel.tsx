"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Terminal, ChevronDown, ChevronUp, Zap, Wallet, DollarSign, Users } from "lucide-react";
import { useYellow } from "@/lib/yellow/YellowEngine";

export function YellowLogPanel({ className }: { className?: string }) {
  const {
    messages,
    wsStatus,
    isAuthenticated,
    isAuthenticating,
    account,
    connectWallet,
    ledgerBalance,
    appSessionId,
    appSessionStatus,
    payerBalance,
    payeeBalance,
    sessionVersion,
    isSessionLoading,
    createAppSession,
    closeSession,
    requestFaucet,
    clobInfo,
  } = useYellow();

  const [expanded, setExpanded] = useState(true);
  const [sessionAmount, setSessionAmount] = useState("100");

  return (
    <div className={cn("w-full bg-white border border-gray-100 rounded-[24px] shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 text-yellow-400 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
              Yellow State Channel
            </h3>
            <p className="text-[10px] font-bold text-gray-900">
              App Session Payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badges */}
          <div className="flex gap-2">
            <StatusBadge label="WS" active={wsStatus === "Connected"} status={wsStatus} />
            <StatusBadge label="Auth" active={isAuthenticated} loading={isAuthenticating} />
            <StatusBadge
              label="Session"
              active={appSessionStatus === "active"}
              status={appSessionStatus}
              loading={appSessionStatus === "creating" || appSessionStatus === "closing"}
            />
          </div>

          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Wallet & Balance Row */}
          <div className="p-4 bg-gray-50/50 grid grid-cols-2 gap-4">
            {/* Wallet */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                Wallet
              </div>
              {account ? (
                <div className="flex items-center gap-2">
                  <Wallet className="w-3 h-3 text-green-500" />
                  <span className="font-mono text-[11px] font-bold text-gray-900">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); connectWallet(); }}
                  className="px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Ledger Balance */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                Ledger Balance
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-yellow-500" />
                <span className="font-mono text-[11px] font-bold text-gray-900">
                  {ledgerBalance} <span className="text-gray-400">yUSD</span>
                </span>
                {isAuthenticated && (
                  <button
                    onClick={(e) => { e.stopPropagation(); requestFaucet(); }}
                    className="ml-auto px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black uppercase rounded hover:bg-yellow-200 transition-colors"
                  >
                    Faucet
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* App Session Panel */}
          {isAuthenticated && (
            <div className="p-4 border-t border-gray-100">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">
                App Session
              </div>

              {appSessionStatus === "active" ? (
                <div className="space-y-3">
                  {/* Session Info */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-[8px] text-purple-600 font-bold uppercase">You (Payer)</div>
                      <div className="text-sm font-black text-purple-900">{payerBalance} <span className="text-[8px] text-purple-400">yUSD</span></div>
                    </div>
                    <div className="p-2 bg-pink-50 rounded-lg border border-pink-100">
                      <div className="text-[8px] text-pink-600 font-bold uppercase">Payee</div>
                      <div className="text-sm font-black text-pink-900">{payeeBalance} <span className="text-[8px] text-pink-400">yUSD</span></div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-[8px] text-gray-500 font-bold uppercase">Version</div>
                      <div className="text-sm font-black text-gray-900">v{sessionVersion}</div>
                    </div>
                  </div>

                  {/* Session ID */}
                  <div className="text-[9px] font-mono text-gray-400 truncate">
                    Session: {appSessionId?.slice(0, 16)}...{appSessionId?.slice(-8)}
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeSession(); }}
                    disabled={isSessionLoading}
                    className="w-full py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isSessionLoading ? "Closing..." : "Close Session"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Create Session */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sessionAmount}
                      onChange={(e) => setSessionAmount(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:border-purple-400"
                      placeholder="100"
                    />
                    <span className="text-[10px] text-gray-400 font-bold">yUSD</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); createAppSession(parseFloat(sessionAmount) || 100); }}
                    disabled={isSessionLoading || appSessionStatus === "creating"}
                    className="w-full py-2.5 bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {appSessionStatus === "creating" ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Users className="w-3 h-3" />
                        Create App Session
                      </>
                    )}
                  </button>

                  {/* CLOB Status */}
                  <div className="text-[9px] text-gray-400 flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", clobInfo?.authenticated ? "bg-green-500" : "bg-gray-300")} />
                    CLOB Server: {clobInfo?.authenticated ? "Connected" : "Not Available (Single-Party Mode)"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Log Terminal */}
          <div className="border-t border-gray-100">
            <div className="bg-gray-900 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/50">
                <Terminal className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Live ClearNode Logs
                </span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
                <div className={cn("w-2 h-2 rounded-full", wsStatus === "Connected" ? "bg-green-500" : "bg-green-500/30")} />
              </div>
            </div>

            <div className="bg-black p-4 max-h-[200px] overflow-y-auto font-mono text-[10px] space-y-1">
              {messages.length === 0 ? (
                <div className="text-white/20 text-center py-4 uppercase tracking-[0.2em] text-[9px]">
                  {wsStatus === "Connected" ? "Waiting for events..." : "Connect wallet to start"}
                </div>
              ) : (
                messages.slice(0, 30).map((msg, idx) => (
                  <LogEntry key={idx} msg={msg} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  label,
  active,
  status,
  loading,
}: {
  label: string;
  active: boolean;
  status?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all",
        active
          ? "bg-green-100 text-green-700"
          : loading
            ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-400"
      )}
    >
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-green-500" : loading ? "bg-yellow-500 animate-pulse" : "bg-gray-300"
        )}
      />
      {label}
      {status && status !== "none" && status !== "Connected" && status !== "active" && (
        <span className="ml-0.5 text-[7px] opacity-70">({status})</span>
      )}
    </div>
  );
}

function LogEntry({ msg }: { msg: { type: string; content: string; timestamp: Date } }) {
  const isError = msg.type === "error";
  const isInfo = msg.type === "info";
  const isSent = msg.type === "sent";
  const isReceived = msg.type === "received";

  return (
    <div className="flex items-start gap-2 text-[9px]">
      <span className="text-white/20 shrink-0 tabular-nums">
        [{msg.timestamp.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
      </span>
      <span
        className={cn(
          "px-1 rounded-[2px] text-[7px] font-black uppercase shrink-0",
          isError
            ? "bg-red-500/20 text-red-400"
            : isInfo
              ? "bg-blue-500/30 text-blue-300"
              : isSent
                ? "bg-purple-500/30 text-purple-300"
                : isReceived
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-gray-500/20 text-gray-400"
        )}
      >
        {msg.type}
      </span>
      <span
        className={cn(
          "break-all",
          isError ? "text-red-300" : "text-white/60"
        )}
      >
        {msg.content.length > 100 ? msg.content.slice(0, 100) + "..." : msg.content}
      </span>
    </div>
  );
}
