"use client";

import React, { useState } from "react";
import { useYellow } from "../yellow-ultimate/YellowEngine";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import {
  Terminal,
  Activity,
  Loader2,
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CheckCircle2,
  Wallet,
  ExternalLink,
  Copy,
  Coins,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

// Mock order book data
const MOCK_ASKS = [
  { price: 0.92, size: 150, total: 138 },
  { price: 0.90, size: 280, total: 252 },
  { price: 0.88, size: 420, total: 369.6 },
  { price: 0.87, size: 180, total: 156.6 },
  { price: 0.86, size: 320, total: 275.2 },
];

const MOCK_BIDS = [
  { price: 0.84, size: 340, total: 285.6 },
  { price: 0.83, size: 210, total: 174.3 },
  { price: 0.82, size: 450, total: 369 },
  { price: 0.80, size: 180, total: 144 },
  { price: 0.78, size: 290, total: 226.2 },
];

export default function TradePage() {
  return <TradeContent />;
}

function TradeContent() {
  const { address } = useAccount();
  const { 
    messages, 
    connected, 
    authenticated, 
    channelStatus, 
    session,
    lastTxHash,
    ledgerBalances,
  } = useYellow();

  const yUsdBalance = ledgerBalances["ytest.usd"] || ledgerBalances["yUSD"] || "0.00";

  return (
    <main className="min-h-screen bg-white pt-20">
      <GlobalHeader />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
              <span className="text-yellow-500">CLOB</span> Order Book
            </h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
              Yellow ClearNet • Off-Chain Settlement • Sepolia
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border",
              connected && authenticated
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-gray-50 text-gray-400 border-gray-200"
            )}>
              <Radio className={cn("w-3 h-3", connected && authenticated && "animate-pulse")} />
              {connected && authenticated ? "LIVE" : "OFFLINE"}
            </div>
            <StatusBadge label="Socket" active={connected} color="blue" />
            <StatusBadge label="Auth" active={authenticated} color="yellow" />
            <StatusBadge label="Channel" active={channelStatus !== "none"} color="green" />
          </div>
        </div>

        {/* Unified Balance Banner - shows after auth */}
        {authenticated && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-1">
                  Unified Balance (Off-Chain Ledger)
                </div>
                <div className="text-3xl font-black text-gray-900 tabular-nums">
                  {parseFloat(yUsdBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-lg text-gray-500 ml-2">ytest.usd</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Instant transfers • No gas fees • Cryptographically secured
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 mb-1">Channel Status</div>
                <div className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-xs uppercase",
                  channelStatus === "funded" ? "bg-green-100 text-green-600" :
                  channelStatus === "open" ? "bg-blue-100 text-blue-600" :
                  channelStatus === "closing" ? "bg-orange-100 text-orange-600" :
                  channelStatus === "closed" ? "bg-purple-100 text-purple-600" :
                  "bg-gray-100 text-gray-500"
                )}>
                  {channelStatus === "none" ? "Not Active" : channelStatus}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Book */}
          <div className="lg:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    YES / yUSD
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Prediction Market Outcome
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-black text-gray-900 tabular-nums">$0.85</div>
                  <div className="text-[10px] font-bold text-green-600">+2.4%</div>
                </div>
                <div className="px-2 py-1 bg-green-100 text-green-600 text-[9px] font-bold rounded uppercase">
                  Live
                </div>
              </div>
            </div>
            <OrderBookDisplay />
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <TradingPanel />
            <ChannelActionsPanel />
          </div>
        </div>

        {/* Bottom: Logs + Proof */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LogTerminal messages={messages} />
          <OnChainProofPanel lastTxHash={lastTxHash} />
        </div>
      </div>
    </main>
  );
}

function OrderBookDisplay() {
  const maxAskSize = Math.max(...MOCK_ASKS.map((a) => a.size));
  const maxBidSize = Math.max(...MOCK_BIDS.map((b) => b.size));

  return (
    <div className="p-4 bg-white">
      <div className="grid grid-cols-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200">
        <span>Price (yUSD)</span>
        <span className="text-center">Size (YES)</span>
        <span className="text-right">Total (yUSD)</span>
      </div>

      {/* Asks */}
      <div className="py-2 space-y-1">
        {[...MOCK_ASKS].reverse().map((order, i) => (
          <div key={`ask-${i}`} className="grid grid-cols-3 text-xs font-bold relative h-7 items-center">
            <div className="absolute inset-y-0 right-0 bg-red-100" style={{ width: `${(order.size / maxAskSize) * 100}%` }} />
            <span className="text-red-600 relative z-10 tabular-nums">${order.price.toFixed(2)}</span>
            <span className="text-gray-700 text-center relative z-10 tabular-nums">{order.size.toLocaleString()}</span>
            <span className="text-gray-500 text-right relative z-10 tabular-nums">${order.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="py-3 flex items-center justify-center gap-4 border-y border-gray-200 bg-gray-50">
        <span className="text-[10px] font-bold text-gray-500 uppercase">Spread</span>
        <span className="text-sm font-black text-yellow-600 tabular-nums">$0.02</span>
        <span className="text-[10px] font-bold text-gray-500">(2.3%)</span>
      </div>

      {/* Bids */}
      <div className="py-2 space-y-1">
        {MOCK_BIDS.map((order, i) => (
          <div key={`bid-${i}`} className="grid grid-cols-3 text-xs font-bold relative h-7 items-center">
            <div className="absolute inset-y-0 right-0 bg-green-100" style={{ width: `${(order.size / maxBidSize) * 100}%` }} />
            <span className="text-green-600 relative z-10 tabular-nums">${order.price.toFixed(2)}</span>
            <span className="text-gray-700 text-center relative z-10 tabular-nums">{order.size.toLocaleString()}</span>
            <span className="text-gray-500 text-right relative z-10 tabular-nums">${order.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradingPanel() {
  const { address } = useAccount();
  const { connected, authenticated, connecting, connect, buyShares, ledgerBalances, isAutoInitializating } = useYellow();

  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("0.85");
  const [isLoading, setIsLoading] = useState(false);

  const yUsdBalance = ledgerBalances["ytest.usd"] || ledgerBalances["yUSD"] || "0.00";
  const total = parseFloat(quantity || "0") * parseFloat(price || "0");

  const handleSubmitOrder = async () => {
    if (!quantity || !price) return;
    setIsLoading(true);
    try {
      await buyShares(quantity, total.toFixed(2));
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="text-center py-6">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">Connect wallet to trade</p>
          <p className="text-[10px] text-gray-400 mt-1">Uses EIP-712 for authentication</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
          <Zap className="w-4 h-4 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Place Order</h3>
          <p className="text-[10px] text-gray-500">{authenticated ? "Off-chain • No gas" : "Connect to trade"}</p>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setOrderType("buy")}
            className={cn(
              "py-2.5 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
              orderType === "buy" ? "bg-green-500 text-white" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Buy
          </button>
          <button
            onClick={() => setOrderType("sell")}
            className={cn(
              "py-2.5 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
              orderType === "sell" ? "bg-red-500 text-white" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Sell
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 font-bold">Available</span>
          <span className="text-gray-900 font-bold tabular-nums">{parseFloat(yUsdBalance).toFixed(2)} ytest.usd</span>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Price (yUSD)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold text-sm tabular-nums focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Quantity (YES)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold text-sm tabular-nums focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex justify-between py-3 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500">Total</span>
          <span className="text-sm font-black text-gray-900 tabular-nums">{total.toFixed(2)} ytest.usd</span>
        </div>

        {!connected || !authenticated ? (
          <button
            onClick={connect}
            disabled={connecting}
            className="w-full py-4 bg-yellow-400 text-gray-900 text-sm font-black uppercase rounded-xl hover:bg-yellow-300 transition-all flex items-center justify-center gap-2"
          >
            {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : <><ShieldCheck className="w-4 h-4" /> Connect to Yellow</>}
          </button>
        ) : (
          <button
            onClick={handleSubmitOrder}
            disabled={!quantity || isLoading || isAutoInitializating}
            className={cn(
              "w-full py-4 text-sm font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2",
              orderType === "buy" ? "bg-green-500 text-white hover:bg-green-400" : "bg-red-500 text-white hover:bg-red-400",
              (!quantity || isLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading || isAutoInitializating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>{orderType === "buy" ? "Buy" : "Sell"} {quantity || "0"} YES</>}
          </button>
        )}
      </div>
    </div>
  );
}

function ChannelActionsPanel() {
  const { session, channelStatus, cashout, requestFaucet, authenticated, withdrawableItems } = useYellow();
  const [isSettling, setIsSettling] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);

  const handleCashout = async () => {
    setIsSettling(true);
    try { await cashout(); } finally { setTimeout(() => setIsSettling(false), 5000); }
  };

  const handleFaucet = async () => {
    setIsFauceting(true);
    try { await requestFaucet(); } finally { setTimeout(() => setIsFauceting(false), 2000); }
  };

  if (!authenticated) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Channel Actions</h3>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold">Session ID</span>
            <span className="text-gray-700 font-mono text-[10px] truncate max-w-[120px]">
              {session.id ? `${session.id.slice(0, 8)}...${session.id.slice(-6)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold">Version</span>
            <span className="text-gray-700 font-mono">{session.version}</span>
          </div>
        </div>

        <button
          onClick={handleFaucet}
          disabled={isFauceting}
          className="w-full py-2.5 border border-yellow-400 bg-yellow-50 text-yellow-700 text-xs font-black uppercase rounded-xl hover:bg-yellow-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isFauceting ? <><Loader2 className="w-3 h-3 animate-spin" /> Requesting...</> : <><Coins className="w-3 h-3" /> Request Faucet Tokens</>}
        </button>

        <button
          onClick={handleCashout}
          disabled={channelStatus !== "open" && channelStatus !== "funded" || isSettling}
          className="w-full py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSettling ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Settling...</>
          ) : channelStatus === "opening" ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Channel Opening...</>
          ) : (
            <>Close & Settle to L1</>
          )}
        </button>

        {channelStatus === "closed" && withdrawableItems.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> Settlement Complete
            </div>
            <p className="text-[10px] text-green-500 mt-1">Balance secured on Sepolia L1</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LogTerminal({ messages }: { messages: any[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-gray-800 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-bold text-gray-400">ClearNode Logs</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
      <div className="h-56 overflow-y-auto p-3 font-mono text-[10px] space-y-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600">Waiting for connection...</div>
        ) : (
          messages.slice(0, 50).map((msg, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-gray-600 shrink-0 w-16">[{msg.timestamp?.toLocaleTimeString?.() || "—"}]</span>
              <span className={cn(
                "px-1 py-0.5 rounded text-[9px] font-bold uppercase shrink-0",
                msg.type === "error" ? "bg-red-500/20 text-red-400" :
                msg.type === "info" ? "bg-blue-500/20 text-blue-300" :
                msg.type === "sent" ? "bg-purple-500/20 text-purple-300" :
                "bg-green-500/20 text-green-300"
              )}>{msg.type}</span>
              <span className="text-gray-500 break-all">{msg.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OnChainProofPanel({ lastTxHash }: { lastTxHash: string | null }) {
  const { session, channelStatus, withdrawableItems } = useYellow();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <Activity className="w-4 h-4 text-green-500" />
        <span className="text-xs font-black text-gray-900 uppercase tracking-wider">On-Chain Proof</span>
        {lastTxHash && (
          <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-600 text-[9px] font-bold rounded-full uppercase">Verified</span>
        )}
      </div>
      <div className="p-4 space-y-4">
        {/* Latest TX */}
        {lastTxHash && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-green-700">Latest Transaction</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[10px] font-mono text-green-800 bg-green-100 px-2 py-1 rounded flex-1 truncate">{lastTxHash}</code>
              <button onClick={() => copyToClipboard(lastTxHash)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title={copied ? "Copied!" : "Copy"}>
                <Copy className="w-3 h-3 text-gray-500" />
              </button>
              <a href={`https://sepolia.etherscan.io/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="View on Etherscan">
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </a>
            </div>
          </div>
        )}

        {/* Active Session */}
        {session.id && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-gray-700">Active Channel</span>
              <span className={cn(
                "ml-auto px-2 py-0.5 text-[9px] font-bold uppercase rounded",
                channelStatus === "funded" ? "bg-green-100 text-green-600" :
                channelStatus === "closed" ? "bg-purple-100 text-purple-600" :
                "bg-gray-200 text-gray-600"
              )}>{channelStatus}</span>
            </div>
            <code className="text-[10px] font-mono text-gray-600 block truncate">{session.id}</code>
          </div>
        )}

        {/* Settlement History */}
        {withdrawableItems.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Settlement History</span>
            {withdrawableItems.slice(-3).map((item, idx) => (
              <div key={idx} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-mono text-[10px]">{item.channel_id?.slice(0, 10)}...</span>
                  <span className="text-green-600 font-bold">Settled ✓</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!lastTxHash && !session.id && (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Connect and trade to see on-chain activity</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, active, color }: { label: string; active: boolean; color: "blue" | "yellow" | "green" }) {
  const colorClasses = {
    blue: active ? "bg-blue-500" : "bg-gray-300",
    yellow: active ? "bg-yellow-500" : "bg-gray-300",
    green: active ? "bg-green-500" : "bg-gray-300",
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
      active ? "bg-white border-gray-200 text-gray-900 shadow-sm" : "bg-gray-50 border-gray-100 text-gray-400"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", colorClasses[color])} />
      {label}
    </div>
  );
}
