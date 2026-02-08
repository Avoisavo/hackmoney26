'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { useRailgunWallet } from './useRailgunWallet';
import { useRailgunEngine } from './useRailgunEngine';
import { usePrivatePositions } from './usePrivatePositions';
import { FACTORY_ADDRESS, RELAYER_ADDRESS } from '@/lib/constants';
import type { PrivateMarketSwapRequest } from '@/lib/railgun/privateMarketSwapService';
import type { PrivateSwapProgress } from '@/lib/railgun/types';

/**
 * Trading step states for progress UI
 */
export type TradingStep =
    | 'idle'
    | 'preparing'
    | 'approving'    // Sending ETH deposit to relayer
    | 'swapping'     // Relayer executing swap on factory
    | 'complete'
    | 'error';

/**
 * Trading progress information
 */
export interface TradingProgress {
    step: TradingStep;
    message: string;
    progress: number; // 0-100
    txHash?: string;
    error?: string;
}

/**
 * Trade parameters
 */
export interface TradeParams {
    marketId: string;
    side: 'YES' | 'NO';
    amount: string; // Human readable amount in ETH (e.g., "0.1")
    privateMode: boolean;
    action: 'buy' | 'sell';
    outcomeIndex?: number;
}

/**
 * Trade result
 */
export interface TradeResult {
    success: boolean;
    txHash?: string;        // Main swap TX hash
    depositTxHash?: string; // ETH deposit to relayer TX hash
    swapTxHash?: string;
    error?: string;
}

const STEP_MESSAGES: Record<TradingStep, string> = {
    idle: 'Ready to trade',
    preparing: 'Preparing trade...',
    approving: 'Depositing ETH to relayer...',
    swapping: 'Executing private swap...',
    complete: 'Trade complete!',
    error: 'Trade failed',
};

// Factory ABI for prediction market swaps (public trades)
const FACTORY_SWAP_ABI = [
    {
        name: 'swap',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'marketId', type: 'bytes32' },
            { name: 'tokenInIndex', type: 'uint256' },
            { name: 'tokenOutIndex', type: 'uint256' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
            { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
    },
] as const;

/**
 * Hook for executing trades on prediction markets with optional privacy.
 *
 * Public trades: user calls factory.swap() directly with ETH.
 * Private trades: user sends ETH to relayer → relayer calls factory.swap().
 *                 The user's address never touches the prediction market.
 */
export function usePrivateMarketTrading() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const { wallet: railgunWallet, status: walletStatus, mnemonic, password } = useRailgunWallet();
    const { status: engineStatus, initialize: initEngine } = useRailgunEngine();

    const [isTrading, setIsTrading] = useState(false);
    const [progress, setProgress] = useState<TradingProgress>({
        step: 'idle',
        progress: 0,
        message: STEP_MESSAGES.idle,
    });
    const [result, setResult] = useState<TradeResult | null>(null);

    const updateProgress = useCallback((step: TradingStep, progressPct: number, txHash?: string, error?: string) => {
        setProgress({
            step,
            progress: progressPct,
            message: STEP_MESSAGES[step],
            txHash,
            error,
        });
    }, []);

    const reset = useCallback(() => {
        setProgress({ step: 'idle', progress: 0, message: STEP_MESSAGES.idle });
        setResult(null);
        setIsTrading(false);
    }, []);

    // ─── Public Trade ────────────────────────────────────────────────────

    const executePublicTrade = useCallback(async (params: TradeParams): Promise<TradeResult> => {
        if (!address || !walletClient || !publicClient) {
            return { success: false, error: 'Wallet not connected' };
        }

        try {
            updateProgress('preparing', 10);

            // Token indices: 0 = collateral (ETH), 1 = YES, 2 = NO
            const tokenInIndex = params.action === 'buy' ? 0 : (params.side === 'YES' ? 1 : 2);
            const tokenOutIndex = params.action === 'buy' ? (params.side === 'YES' ? 1 : 2) : 0;

            updateProgress('swapping', 50);

            const amountIn = parseUnits(params.amount, 18);

            // Swap with native ETH
            const hash = await walletClient.writeContract({
                address: FACTORY_ADDRESS,
                abi: FACTORY_SWAP_ABI,
                functionName: 'swap',
                args: [
                    params.marketId as `0x${string}`,
                    BigInt(tokenInIndex),
                    BigInt(tokenOutIndex),
                    amountIn,
                    0n, // minAmountOut
                    0n, // sqrtPriceLimitX96
                ],
                value: params.action === 'buy' ? amountIn : 0n,
            });

            await publicClient.waitForTransactionReceipt({ hash });
            updateProgress('complete', 100, hash);

            return { success: true, txHash: hash };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Trade failed';
            updateProgress('error', 0, undefined, errorMessage);
            return { success: false, error: errorMessage };
        }
    }, [address, walletClient, publicClient, updateProgress]);

    // ─── Private Trade ───────────────────────────────────────────────────

    const executePrivateTrade = useCallback(async (params: TradeParams): Promise<TradeResult> => {
        if (!address || !walletClient || !publicClient) {
            return { success: false, error: 'Wallet not connected' };
        }

        if (walletStatus !== 'ready' || !railgunWallet || !mnemonic || !password) {
            if (engineStatus !== 'ready') await initEngine();
            return { success: false, error: 'Private wallet not initialized. Please enable stealth mode first.' };
        }

        try {
            const amountIn = parseUnits(params.amount, 18);

            // Token indices: 0 = collateral (ETH), 1 = YES, 2 = NO
            const tokenInIndex = params.action === 'buy' ? 0 : (params.side === 'YES' ? 1 : 2);
            const tokenOutIndex = params.action === 'buy' ? (params.side === 'YES' ? 1 : 2) : 0;

            // ────────────────────────────────────────────────────────────
            // STEP 1: Send ETH to relayer (for buy)
            // This is the only on-chain action from the user's address.
            // The relayer address is a generic intermediary — it doesn't
            // reveal what the user is trading.
            // ────────────────────────────────────────────────────────────
            let depositTxHash: string | undefined;

            if (params.action === 'buy') {
                updateProgress('approving', 10);
                console.log(`[Private Trade] Sending ${params.amount} ETH to relayer ${RELAYER_ADDRESS}...`);

                depositTxHash = await walletClient.sendTransaction({
                    to: RELAYER_ADDRESS as `0x${string}`,
                    value: amountIn,
                });

                updateProgress('approving', 25, depositTxHash);
                await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
                console.log('[Private Trade] ETH deposit confirmed:', depositTxHash);
            }

            // ────────────────────────────────────────────────────────────
            // STEP 2: Call API — relayer executes the swap
            // The relayer's address interacts with the pool, not the user.
            // ────────────────────────────────────────────────────────────
            updateProgress('swapping', 40);

            const requestBody: PrivateMarketSwapRequest = {
                userAddress: address,
                marketId: params.marketId,
                tokenInIndex,
                tokenOutIndex,
                amount: amountIn.toString(),
                action: params.action,
                depositTxHash,
                senderWalletID: railgunWallet.walletID,
                senderRailgunAddress: railgunWallet.railgunAddress,
                mnemonic,
                password,
            };

            const response = await fetch('/api/relayer/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Trade failed at API level');
            }

            // ────────────────────────────────────────────────────────────
            // STEP 3: Handle SSE progress stream
            // ────────────────────────────────────────────────────────────
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let tradeResult: TradeResult = { success: false };
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6)) as PrivateSwapProgress;

                            let uiStep: TradingStep = 'swapping';
                            if (data.step === 'complete') uiStep = 'complete';
                            else if (data.step === 'error') uiStep = 'error';

                            if (data.step === 'error') {
                                throw new Error(data.message || 'Trade flow failed');
                            }

                            if (data.step === 'complete') {
                                tradeResult = {
                                    success: true,
                                    txHash: data.swapTxHash,
                                    swapTxHash: data.swapTxHash,
                                    depositTxHash,
                                };
                            }

                            updateProgress(uiStep, data.progress, data.txHash || data.swapTxHash, data.error);
                        } catch (e) {
                            if (e instanceof Error && e.message.includes('Trade flow failed')) throw e;
                            console.warn('Failed to parse SSE:', e);
                        }
                    }
                }
            }

            return tradeResult;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Private trade failed';
            console.error('[Private Trade] Error:', error);
            updateProgress('error', 0, undefined, errorMessage);
            return { success: false, error: errorMessage };
        }
    }, [address, walletClient, publicClient, walletStatus, railgunWallet, engineStatus, initEngine, updateProgress, mnemonic, password]);

    // ─── Position tracking ───────────────────────────────────────────────

    const { addPosition, reducePosition, getPosition } = usePrivatePositions();

    // ─── Main entry point ────────────────────────────────────────────────

    const executeTrade = useCallback(async (params: TradeParams): Promise<TradeResult> => {
        setIsTrading(true);
        setResult(null);

        try {
            const tradeResult = params.privateMode
                ? await executePrivateTrade(params)
                : await executePublicTrade(params);

            setResult(tradeResult);
            return tradeResult;
        } finally {
            setIsTrading(false);
        }
    }, [executePublicTrade, executePrivateTrade]);

    const isPrivateTradingAvailable = walletStatus === 'ready';

    return {
        executeTrade,
        isTrading,
        progress,
        result,
        reset,
        isPrivateTradingAvailable,
        railgunWallet,
        getPosition,
        addPosition,
        reducePosition,
        shieldedBalance: 0n,
        refreshShieldedBalance: () => {},
    };
}
