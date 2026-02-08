'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, parseAbi } from 'viem';
import { useRailgunWallet } from './useRailgunWallet';
import { useRailgunEngine } from './useRailgunEngine';
import { usePrivatePositions } from './usePrivatePositions';
import { FACTORY_ADDRESS, RELAYER_ADDRESS, SEPOLIA_WETH } from '@/lib/constants';
import type { PrivateMarketSwapRequest } from '@/lib/railgun/privateMarketSwapService';
import type { PrivateSwapProgress } from '@/lib/railgun/types';

/**
 * Trading step states for progress UI.
 * Expanded to reflect the full RAILGUN privacy pipeline.
 */
export type TradingStep =
    | 'idle'
    | 'preparing'          // Initial setup
    | 'approving'          // Wrapping ETH→WETH & approving relayer
    | 'shielding'          // Shielding into RAILGUN privacy pool
    | 'waiting_poi'        // Waiting for POI verification
    | 'generating_proof'   // Generating ZK proof
    | 'unshielding'        // Unshielding to adapter
    | 'swapping'           // Executing swap on adapter / factory
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
    txHash?: string;           // Main swap TX hash
    inputShieldTxHash?: string; // Shield TX hash
    unshieldTxHash?: string;    // Unshield TX hash
    swapTxHash?: string;
    error?: string;
}

const STEP_MESSAGES: Record<TradingStep, string> = {
    idle: 'Ready to trade',
    preparing: 'Preparing trade...',
    approving: 'Wrapping ETH & approving relayer...',
    shielding: 'Shielding tokens into privacy pool...',
    waiting_poi: 'Verifying privacy (POI)...',
    generating_proof: 'Generating ZK proof...',
    unshielding: 'Unshielding to adapter...',
    swapping: 'Executing private swap...',
    complete: 'Trade complete!',
    error: 'Trade failed',
};

// WETH ABI for wrapping & approving
const WETH_ABI = parseAbi([
    'function deposit() payable',
    'function approve(address spender, uint256 amount) returns (bool)',
]);

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
 * Private trades: user wraps ETH→WETH, approves relayer, relayer runs full
 *   RAILGUN pipeline (shield → POI → ZK proof → unshield → adapter.privateSwap).
 *   The user's EOA never touches the prediction market factory.
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

    const updateProgress = useCallback((step: TradingStep, progressPct: number, message?: string, txHash?: string, error?: string) => {
        setProgress({
            step,
            progress: progressPct,
            message: message || STEP_MESSAGES[step],
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
            updateProgress('complete', 100, undefined, hash);

            return { success: true, txHash: hash };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Trade failed';
            updateProgress('error', 0, undefined, undefined, errorMessage);
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

            // For BUY via adapter: tokenInIndex = 999 (collateral WETH), tokenOutIndex = outcome index
            // For SELL via adapter: tokenInIndex = outcome index, tokenOutIndex = 999 (collateral WETH)
            const tokenInIndex = params.action === 'buy' ? 999 : (params.side === 'YES' ? 1 : 2);
            const tokenOutIndex = params.action === 'buy' ? (params.side === 'YES' ? 1 : 2) : 999;

            // ────────────────────────────────────────────────────────────
            // STEP 1: Wrap ETH → WETH
            // This is an on-chain action from the user's address, but only
            // reveals an ETH→WETH wrap — not the prediction market trade.
            // ────────────────────────────────────────────────────────────
            updateProgress('approving', 5, 'Wrapping ETH to WETH...');
            console.log(`[Private Trade] Wrapping ${params.amount} ETH to WETH...`);

            const wrapHash = await walletClient.writeContract({
                address: SEPOLIA_WETH as `0x${string}`,
                abi: WETH_ABI,
                functionName: 'deposit',
                value: amountIn,
            });

            await publicClient.waitForTransactionReceipt({ hash: wrapHash });
            console.log('[Private Trade] ETH wrapped to WETH:', wrapHash);

            // ────────────────────────────────────────────────────────────
            // STEP 2: Approve relayer to spend WETH
            // Again, only reveals that the user approved a generic address.
            // ────────────────────────────────────────────────────────────
            updateProgress('approving', 10, 'Approving relayer for WETH...');
            console.log(`[Private Trade] Approving relayer ${RELAYER_ADDRESS} for WETH...`);

            const approveHash = await walletClient.writeContract({
                address: SEPOLIA_WETH as `0x${string}`,
                abi: WETH_ABI,
                functionName: 'approve',
                args: [RELAYER_ADDRESS as `0x${string}`, amountIn],
            });

            await publicClient.waitForTransactionReceipt({ hash: approveHash });
            console.log('[Private Trade] Relayer approved for WETH:', approveHash);

            // ────────────────────────────────────────────────────────────
            // STEP 3: POST to API — relayer executes the private swap.
            // Fast mode (default): relayer transfers WETH directly to
            //   adapter → adapter.privateSwap(). Fast and reliable.
            // Full mode: shield → POI → ZK proof → unshield → swap.
            //   Maximum privacy but very slow (2-10+ min for proof).
            // ────────────────────────────────────────────────────────────
            updateProgress('swapping', 15, 'Submitting to relayer...');

            const requestBody: PrivateMarketSwapRequest = {
                userAddress: address,
                marketId: params.marketId,
                tokenInIndex,
                tokenOutIndex,
                amount: amountIn.toString(),
                action: params.action,
                fastMode: false, // Use RAILGUN proxy (shield → POI → unshield → adapter)
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
            // STEP 4: Handle SSE progress stream from the server
            // Map server PrivateSwapStep to client TradingStep.
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

                            // Map server step directly to client TradingStep
                            let uiStep: TradingStep = 'swapping';
                            if (data.step === 'preparing') uiStep = 'preparing';
                            else if (data.step === 'approving') uiStep = 'approving';
                            else if (data.step === 'shielding') uiStep = 'shielding';
                            else if (data.step === 'waiting_poi') uiStep = 'waiting_poi';
                            else if (data.step === 'generating_proof') uiStep = 'generating_proof';
                            else if (data.step === 'unshielding') uiStep = 'unshielding';
                            else if (data.step === 'transferring') uiStep = 'swapping';
                            else if (data.step === 'complete') uiStep = 'complete';
                            else if (data.step === 'error') uiStep = 'error';

                            if (data.step === 'error') {
                                throw new Error(data.message || 'Trade flow failed');
                            }

                            if (data.step === 'complete') {
                                tradeResult = {
                                    success: true,
                                    txHash: data.swapTxHash,
                                    inputShieldTxHash: data.inputShieldTxHash,
                                    unshieldTxHash: data.unshieldTxHash,
                                    swapTxHash: data.swapTxHash,
                                };
                            }

                            updateProgress(
                                uiStep,
                                data.progress,
                                data.message,
                                data.txHash || data.swapTxHash,
                                data.error,
                            );
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
            updateProgress('error', 0, undefined, undefined, errorMessage);
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
