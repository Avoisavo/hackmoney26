"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { useAccount, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Mnemonic, keccak256 as ethersKeccak256, toUtf8Bytes } from "ethers";

import { RouletteSelection } from "@/app/markets/[id]/page";
import iranData from "@/data/iran.json";
import { usePrivateMarketTrading, type TradingStep } from "@/hooks/usePrivateMarketTrading";
import { useRailgunEngine } from "@/hooks/useRailgunEngine";
import { useRailgunWallet } from "@/hooks/useRailgunWallet";
import { useShielding } from "@/hooks/useShielding";

// Deterministic message for RAILGUN wallet derivation from connected wallet
const DERIVATION_MESSAGE =
    "Sign this message to create your private RAILGUN wallet for Xiphias prediction markets.\n\nThis signature is free and does not cost any gas.";

interface IranWarExecutionDockProps {
    className?: string;
    selection?: RouletteSelection;
}

// Progress step display component
const ProgressStep = ({ step, progress, message }: { step: TradingStep; progress: number; message: string }) => {
    if (step === 'idle') return null;

    const isError = step === 'error';
    const isComplete = step === 'complete';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
                "rounded-xl p-4 border",
                isError ? "bg-red-50 border-red-200" :
                    isComplete ? "bg-green-50 border-green-200" :
                        "bg-blue-50 border-blue-200"
            )}
        >
            <div className="flex items-center gap-3">
                {!isComplete && !isError && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
                {isComplete && (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                    </div>
                )}
                {isError && (
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-white text-[10px]">!</span>
                    </div>
                )}
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-700">{message}</div>
                    {!isComplete && !isError && (
                        <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const IranWarExecutionDock = ({ className, selection }: IranWarExecutionDockProps) => {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { openConnectModal } = useConnectModal();
    const [mode, setMode] = useState<"buy" | "sell">("buy");
    const [amount, setAmount] = useState<string>("0.1");
    const [stealthMode, setStealthMode] = useState(false);
    const [walletSetupState, setWalletSetupState] = useState<{
        loading: boolean;
        error: string | null;
        step: string;
    }>({ loading: false, error: null, step: '' });
    const [walletBalance, setWalletBalance] = useState<string>('0.0000');
    const autoRestoreAttempted = useRef(false);

    // Trading hook
    const {
        executeTrade,
        isTrading,
        progress,
        result,
        reset,
        isPrivateTradingAvailable,
        railgunWallet,
        getPosition,
        shieldedBalance,
        refreshShieldedBalance,
    } = usePrivateMarketTrading();

    // Shielding hook for unshield
    const { unshieldETH, isUnshielding, shieldedBalanceFormatted } = useShielding();

    // Railgun context for wallet setup
    const {
        status: railgunEngineStatus,
        initialize: initializeRailgun
    } = useRailgunEngine();

    const {
        createWallet,
        generateMnemonic,
        wallet: railgunWalletData,
        status: walletStatus
    } = useRailgunWallet();

    const railgunEngineInitialized = railgunEngineStatus === 'ready';
    const railgunInitializing = railgunEngineStatus === 'initializing';

    // Parse amount
    const investAmount = parseFloat(amount.replace(/,/g, '')) || 0;

    // Get current position for the market (if in stealth mode)
    const marketId = "0x" + "1".repeat(64) as `0x${string}`;
    const currentYesPosition = stealthMode && selection ? getPosition(marketId, 'YES') : null;
    const currentNoPosition = stealthMode && selection ? getPosition(marketId, 'NO') : null;
    const selectedSide = selection?.selectedOutcome === 'yes' ? 'YES' : 'NO';
    const currentPosition = selectedSide === 'YES' ? currentYesPosition : currentNoPosition;

    // Get wallet balance (for buy mode)
    React.useEffect(() => {
        const fetchBalance = async () => {
            if (address && window.ethereum) {
                try {
                    const balance = await window.ethereum.request({
                        method: 'eth_getBalance',
                        params: [address, 'latest']
                    });
                    const ethBalance = parseInt(balance, 16) / 1e18;
                    setWalletBalance(ethBalance.toFixed(4));
                } catch (error) {
                    console.error('Failed to fetch balance:', error);
                }
            }
        };
        fetchBalance();
    }, [address]);

    // Auto-restore wallet from localStorage when address is available
    // This runs silently in the background so the wallet is ready when stealth mode is toggled
    React.useEffect(() => {
        if (!address || walletStatus === 'ready' || walletStatus === 'creating' || autoRestoreAttempted.current) return;
        autoRestoreAttempted.current = true;

        const storageKey = `railgun_wallet_${address}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const { mnemonic, password } = JSON.parse(stored);
                if (mnemonic && password) {
                    console.log('[Stealth] Auto-restoring RAILGUN wallet from storage...');
                    createWallet(mnemonic, password).catch(err => {
                        console.error('[Stealth] Auto-restore failed:', err);
                        localStorage.removeItem(storageKey);
                    });
                }
            } catch {
                localStorage.removeItem(storageKey);
            }
        }
    }, [address, walletStatus, createWallet]);

    // Reset auto-restore flag when address changes
    React.useEffect(() => {
        autoRestoreAttempted.current = false;
    }, [address]);

    // Auto-setup wallet when stealth mode is enabled (only triggers signing if no stored wallet)
    React.useEffect(() => {
        if (stealthMode && !isPrivateTradingAvailable && !walletSetupState.loading && address && walletClient) {
            handleSetupWallet();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stealthMode, address]);

    // Calculate payouts
    const calculations = React.useMemo(() => {
        if (!selection || selection.selectedCells.length === 0) return null;

        const targetDate = selection.selectedDate;
        const selectedOutcome = selection.selectedOutcome || "yes";

        const activeBets = selection.selectedEvents.map(evt => {
            const market = iranData.markets.find(m => evt === "on" ? m.type === "on_date" : m.type === "by_date");
            if (!market) return null;

            const dataPoint = market.data.find(d => parseInt(d.date.split('-')[2], 10) === targetDate);
            if (!dataPoint) return null;

            const priceCents = selectedOutcome === "yes" ? dataPoint.yes_cents : dataPoint.no_cents;
            const price = priceCents / 100;
            const stake = investAmount / selection.selectedEvents.length;
            const shares = price > 0 ? stake / price : 0;

            return {
                type: evt,
                target: targetDate,
                outcome: selectedOutcome,
                price,
                stake,
                shares,
                getPayout: (outcomeDate: number | "never") => {
                    if (selectedOutcome === "yes") {
                        if (evt === "on") {
                            return outcomeDate === targetDate ? shares : 0;
                        } else {
                            if (outcomeDate === "never") return 0;
                            return outcomeDate <= targetDate ? shares : 0;
                        }
                    } else {
                        if (evt === "on") {
                            return outcomeDate !== targetDate ? shares : 0;
                        } else {
                            if (outcomeDate === "never") return shares;
                            return outcomeDate > targetDate ? shares : 0;
                        }
                    }
                }
            };
        }).filter(Boolean) as any[];

        if (positions.length === 0) return null;

        const scenarios = [];
        if (targetDate > 1) {
            scenarios.push({ label: `1-${targetDate - 1}`, val: 1 });
        }
        scenarios.push({ label: `${targetDate}`, val: targetDate });
        if (targetDate < 28) {
            scenarios.push({ label: `${targetDate + 1}-28`, val: targetDate + 1 });
        }
        scenarios.push({ label: "Never", val: "never" });

        const rows = scenarios.map(scen => {
            const payouts = activeBets.map(bet => bet.getPayout(scen.val));
            const totalPayout = payouts.reduce((a: number, b: number) => a + b, 0);
            const profit = totalPayout - investAmount;
            return {
                label: scen.label,
                payouts,
                totalPayout,
                profit
            };
        });

        return { activeBets: positions, rows };
    }, [selection, investAmount]);

    const handleSubmit = async () => {
        if (!isConnected) {
            openConnectModal?.();
            return;
        }

        // Require Railgun wallet for stealth mode
        if (stealthMode && !isPrivateTradingAvailable) {
            // Prompt wallet setup (handled in UI)
            return;
        }

        if (!calculations || !selection) return;

        // Generate a mock market ID based on selection (must be valid hex)
        const marketId = "0x" + "1".repeat(64) as `0x${string}`; // Valid hex bytes32
        const side = selection.selectedOutcome === 'yes' ? 'YES' : 'NO';

        await executeTrade({
            marketId,
            side: side as 'YES' | 'NO',
            amount: amount,
            privateMode: stealthMode,
            action: mode, // Pass buy/sell mode
        });
    };

    const handleSetupWallet = async () => {
        if (!address || !walletClient) {
            openConnectModal?.();
            return;
        }

        setWalletSetupState({ loading: true, error: null, step: 'Initializing engine...' });

        try {
            // Initialize RAILGUN engine first if needed
            if (!railgunEngineInitialized) {
                setWalletSetupState({ loading: true, error: null, step: 'Starting RAILGUN engine...' });
                await initializeRailgun();
            }

            const storageKey = `railgun_wallet_${address}`;
            let mnemonic: string;
            let password: string;

            // Check localStorage for previously derived wallet
            const stored = localStorage.getItem(storageKey);

            if (stored) {
                // Restore from localStorage (no signing needed)
                const data = JSON.parse(stored);
                mnemonic = data.mnemonic;
                password = data.password;
                setWalletSetupState({ loading: true, error: null, step: 'Restoring private wallet...' });
            } else {
                // Derive wallet from connected wallet signature
                // The user signs a deterministic message - the same wallet address always
                // produces the same RAILGUN wallet (deterministic derivation)
                setWalletSetupState({ loading: true, error: null, step: 'Sign to create private wallet...' });

                const signature = await walletClient.signMessage({
                    account: address,
                    message: DERIVATION_MESSAGE,
                });

                // Hash the signature to get 16 bytes of entropy -> 12-word BIP-39 mnemonic
                const hash = ethersKeccak256(toUtf8Bytes(signature));
                const entropy = hash.slice(0, 34); // 0x + 32 hex chars = 16 bytes
                mnemonic = Mnemonic.fromEntropy(entropy).phrase;
                password = `xiphias_${address}`;

                // Persist for future sessions (same wallet = same RAILGUN wallet)
                localStorage.setItem(storageKey, JSON.stringify({ mnemonic, password }));
            }

            setWalletSetupState({ loading: true, error: null, step: 'Creating private wallet...' });
            await createWallet(mnemonic, password);

            setWalletSetupState({ loading: false, error: null, step: 'Complete!' });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error during setup';
            console.error('Failed to setup wallet:', error);
            setWalletSetupState({ loading: false, error: errorMsg, step: '' });
        }
    };

    if (!calculations) {
        return (
            <div className={cn("w-full bg-white border border-gray-100 rounded-[24px] p-4 shadow-sm space-y-4", className)}>
                <div className="text-center text-gray-400 py-8 text-xs">Select a date on the grid to calculate profit</div>
            </div>
        );
    }

    return (
        <div className={cn("w-full bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm space-y-6", className)}>
            {/* Header with Stealth Toggle */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold text-lg">
                        ∑
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#9CA3AF]">Profit Simulator</h3>
                        <p className="text-xs font-bold text-gray-900">Scenario Analysis</p>
                    </div>
                </div>

                {/* Stealth Mode Toggle */}
                <button
                    onClick={() => setStealthMode(!stealthMode)}
                    className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-300",
                        stealthMode
                            ? "border-purple-500/50 bg-purple-500/20 text-purple-600"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                    )}
                >
                    {stealthMode ? (
                        <EyeOff className="w-4 h-4" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                    <span className="text-xs font-bold">Stealth</span>
                    <div
                        className={cn(
                            "relative w-8 h-4 rounded-full transition-colors duration-300",
                            stealthMode ? "bg-purple-500" : "bg-gray-300"
                        )}
                    >
                        <div
                            className={cn(
                                "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-300",
                                stealthMode ? "translate-x-4" : "translate-x-0.5"
                            )}
                        />
                    </div>
                </button>
            </div>

            {/* Stealth Mode Wallet Setup */}
            {stealthMode && !isPrivateTradingAvailable && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-purple-50 border border-purple-200 p-4"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-bold text-purple-700">Private Wallet Required</span>
                    </div>
                    <p className="text-xs text-purple-600 mb-3">
                        Create a RAILGUN wallet to enable private trading with ZK proofs.
                    </p>

                    {/* Error Display */}
                    {walletSetupState.error && (
                        <div className="mb-3 p-2 rounded-lg bg-red-100 border border-red-300">
                            <p className="text-xs text-red-700 font-medium">⚠️ {walletSetupState.error}</p>
                        </div>
                    )}

                    {/* Progress Step Display */}
                    {walletSetupState.loading && walletSetupState.step && (
                        <div className="mb-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            <span className="text-xs text-purple-600">{walletSetupState.step}</span>
                        </div>
                    )}

                    <button
                        onClick={handleSetupWallet}
                        disabled={walletSetupState.loading}
                        className="w-full h-10 rounded-lg bg-purple-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                        {walletSetupState.loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {walletSetupState.step || 'Setting up...'}
                            </span>
                        ) : 'Setup Private Wallet'}
                    </button>
                </motion.div>
            )}

            {/* Private Wallet Status */}
            {stealthMode && isPrivateTradingAvailable && railgunWallet && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200"
                >
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-mono text-purple-700">
                        {railgunWallet.railgunAddress?.slice(0, 12)}...
                    </span>
                    <span className="text-[10px] text-purple-500 ml-auto">Private Wallet Active</span>
                </motion.div>
            )}

            {/* Buy/Sell Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    onClick={() => setMode('buy')}
                    className={cn(
                        "flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all",
                        mode === 'buy'
                            ? "bg-white text-green-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Buy
                </button>
                <button
                    onClick={() => setMode('sell')}
                    className={cn(
                        "flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all",
                        mode === 'sell'
                            ? "bg-white text-red-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Sell
                </button>
            </div>


            {/* Balance Display - Shows wallet balance (buy) or share balance (sell) */}
            {stealthMode && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={cn(
                        "rounded-lg border p-3",
                        mode === 'buy'
                            ? "bg-green-50 border-green-200"
                            : "bg-blue-50 border-blue-200"
                    )}
                >
                    <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest mb-2",
                        mode === 'buy' ? "text-green-400" : "text-blue-400"
                    )}>
                        {mode === 'buy' ? 'Wallet Balance' : 'Your Position'}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={cn(
                            "text-xs font-bold",
                            mode === 'buy' ? "text-green-900" : "text-blue-900"
                        )}>
                            {mode === 'buy' ? 'ETH Available' : `${selectedSide} Shares`}
                        </span>
                        <div className="text-right">
                            <div className={cn(
                                "text-sm font-bold",
                                mode === 'buy' ? "text-green-900" : "text-blue-900"
                            )}>
                                {mode === 'buy'
                                    ? walletBalance
                                    : currentPosition
                                        ? (Number(currentPosition.shares) / 1e18).toFixed(4)
                                        : '0.0000'
                                }
                            </div>
                            {mode === 'sell' && currentPosition && (
                                <div className="text-[10px] text-blue-600">
                                    Avg: ${currentPosition.averagePrice.toFixed(4)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shielded Balance Section */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-bold text-purple-500">SHIELDED BALANCE</div>
                                <div className="text-sm font-bold text-purple-900">
                                    {shieldedBalanceFormatted} WETH
                                </div>
                            </div>
                            {parseFloat(shieldedBalanceFormatted) > 0 && (
                                <button
                                    onClick={async () => {
                                        if (shieldedBalance && shieldedBalance > 0n) {
                                            await unshieldETH(shieldedBalance);
                                            refreshShieldedBalance?.();
                                        }
                                    }}
                                    disabled={isUnshielding}
                                    className="px-3 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50"
                                >
                                    {isUnshielding ? 'Withdrawing...' : 'Withdraw All'}
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>Bet Amount (ETH)</span>
                    <span className="text-[#10B981]">Uses Native ETH</span>
                </div>
                <div className="relative group">
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black rounded-xl h-14 px-4 pl-14 text-xl font-bold text-gray-900 transition-all outline-none"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ETH</span>
                </div>
            </div>

            {/* Bet Summary */}
            <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Your Position</div>
                {calculations.activeBets.map((bet: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-900">
                            {bet.type === "on_date" ? "ON" : "BY"} {bet.target}
                        </span>
                        <div className="flex gap-2">
                            <span className="text-gray-500">{bet.shares.toFixed(1)} sh</span>
                            <span className="font-mono text-gray-900">@ {bet.price.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between text-[10px] font-bold">
                    <span>Total Cost</span>
                    <span>${investAmount.toFixed(2)}</span>
                </div>
            </div>

            {/* Resolution Table */}
            <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Resolution Payouts</div>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <div className="grid grid-cols-[1fr_1fr_1fr] bg-gray-100 p-2 font-bold text-gray-500">
                        <span>Outcome</span>
                        <span className="text-right">Payout</span>
                        <span className="text-right">Profit</span>
                    </div>
                    {calculations.rows.map((row: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr] border-t border-gray-100 p-1.5 items-center bg-white">
                            <span className="font-bold text-gray-900">{row.label}</span>
                            <span className="text-right font-mono text-gray-600">${row.totalPayout.toFixed(1)}</span>
                            <span className={cn("text-right font-mono font-bold", row.profit >= 0 ? "text-[#10B981]" : "text-red-500")}>
                                {row.profit >= 0 ? "+" : ""}{row.profit.toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trading Progress */}
            <AnimatePresence>
                {isTrading && (
                    <ProgressStep step={progress.step} progress={progress.progress} message={progress.message} />
                )}
            </AnimatePresence>

            {/* Result Message */}
            <AnimatePresence>
                {result && !isTrading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={cn(
                            "rounded-xl p-4 border",
                            result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        )}
                    >
                        <div className="text-xs font-bold">
                            {result.success ? (
                                <span className="text-green-700">
                                    ✓ Trade executed successfully!
                                    {result.txHash && (
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 underline"
                                        >
                                            View TX
                                        </a>
                                    )}
                                </span>
                            ) : (
                                <span className="text-red-700">✗ {result.error}</span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isTrading || (stealthMode && !isPrivateTradingAvailable)}
                className={cn(
                    "w-full h-14 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0",
                    stealthMode
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-black text-white hover:bg-gray-900"
                )}
            >
                {isTrading ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Executing...
                    </span>
                ) : stealthMode ? (
                    mode === 'buy' ? "Place Private Buy" : "Place Private Sell"
                ) : (
                    mode === 'buy' ? "Place Buy Bets" : "Place Sell Bets"
                )}
            </button>

            {/* Privacy Notice */}
            {stealthMode && (
                <p className="text-center text-[9px] font-medium text-purple-500 leading-relaxed">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Trade executed privately via RAILGUN ZK proofs. Your identity is shielded.
                </p>
            )}
        </div>
    );
};
