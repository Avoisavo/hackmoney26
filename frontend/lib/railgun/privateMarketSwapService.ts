/**
 * Private Market Swap Service - Privacy via Relayer for Prediction Markets
 *
 * The prediction market uses native ETH as collateral and ERC20 outcome tokens.
 * Privacy is achieved by having the relayer interact with the pool on behalf of the user.
 * The user's address never touches the prediction market factory directly.
 *
 * Flow (Buy):
 * 1. User sends ETH to relayer address (client-side)
 * 2. Relayer calls factory.swap{value}() to buy outcome tokens
 * 3. Outcome tokens held by relayer, tracked for user via RAILGUN address
 *
 * Flow (Sell):
 * 1. User approves & transfers outcome tokens to relayer (client-side)
 * 2. Relayer calls factory.swap() to sell outcome tokens for ETH
 * 3. Relayer sends ETH back to user
 */

import { ethers, Contract } from 'ethers';
import { relayerService } from '@/lib/railgun/relayer';
import { FACTORY_ADDRESS } from '@/lib/constants';
import type {
    PrivateSwapStep,
    PrivateSwapProgress,
    PrivateSwapResult,
} from '@/lib/railgun/types';

// ─── Request Type ────────────────────────────────────────────────────────────

export interface PrivateMarketSwapRequest {
    userAddress: string;
    marketId: string;
    tokenInIndex: number;
    tokenOutIndex: number;
    amount: string;           // ETH amount in wei (string for serialization)
    action: 'buy' | 'sell';
    depositTxHash?: string;   // TX hash of user's ETH deposit to relayer (for buy)

    // RAILGUN wallet identity (for position tracking)
    senderWalletID: string;
    senderRailgunAddress: string;
    mnemonic: string;
    password: string;
}

// ─── Factory ABI (Uniswap V4 Prediction Market) ─────────────────────────────

const FACTORY_SWAP_ABI = [
    'function swap(bytes32 marketId, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 amountIn, uint256 minAmountOut, uint160 sqrtPriceLimitX96) payable returns (uint256 amountOut)',
];

// ─── Retry helper ────────────────────────────────────────────────────────────

async function withRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    initialDelayMs: number = 2000,
): Promise<T> {
    let lastError: Error | null = null;
    let delayMs = initialDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries) {
                console.log(`[PrivateSwap] ${operationName} failed after ${maxRetries} attempts`);
                throw lastError;
            }
            console.log(`[PrivateSwap] ${operationName} attempt ${attempt} failed, retrying in ${delayMs}ms...`);
            await new Promise(r => setTimeout(r, delayMs));
            delayMs *= 2;
        }
    }
    throw lastError || new Error(`${operationName} failed`);
}

// ─── Progress callback type ──────────────────────────────────────────────────

export type ProgressCallback = (progress: PrivateSwapProgress) => void;

// ─── Service ─────────────────────────────────────────────────────────────────

class PrivateMarketSwapService {
    private static instance: PrivateMarketSwapService | null = null;

    private constructor() {}

    static getInstance(): PrivateMarketSwapService {
        if (!PrivateMarketSwapService.instance) {
            PrivateMarketSwapService.instance = new PrivateMarketSwapService();
        }
        return PrivateMarketSwapService.instance;
    }

    /**
     * Execute a private swap.
     *
     * For BUY: user already deposited ETH to the relayer.
     *          Relayer calls factory.swap{value}() with native ETH.
     *
     * For SELL: (future) user transfers outcome tokens to relayer,
     *           relayer sells them on factory.
     */
    async executePrivateSwap(
        params: PrivateMarketSwapRequest,
        onProgress?: ProgressCallback,
    ): Promise<PrivateSwapResult> {
        const {
            userAddress,
            marketId,
            tokenInIndex,
            tokenOutIndex,
            amount: amountStr,
            action,
            depositTxHash,
        } = params;

        const amount = BigInt(amountStr);
        const result: PrivateSwapResult = { success: false };

        const progress = (step: PrivateSwapStep, pct: number, message: string, extra?: Partial<PrivateSwapProgress>) => {
            console.log(`[PrivateSwap] ${step}: ${message} (${pct}%)`);
            onProgress?.({ step, progress: pct, message, ...extra });
        };

        try {
            // ══════════════════════════════════════════════════════════════
            // VALIDATION
            // ══════════════════════════════════════════════════════════════
            if (!relayerService.isConfigured()) {
                throw new Error('Relayer not configured');
            }

            const relayerWallet = relayerService.getWallet();
            const provider = relayerService.getProvider();

            console.log('[PrivateSwap] === PRIVATE MARKET SWAP STARTED ===');
            console.log(`[PrivateSwap] Action: ${action}`);
            console.log(`[PrivateSwap] Amount: ${ethers.formatEther(amount)} ETH`);
            console.log(`[PrivateSwap] Market: ${marketId}`);
            console.log(`[PrivateSwap] User: ${userAddress}`);
            console.log(`[PrivateSwap] Relayer: ${relayerWallet.address}`);

            if (action === 'buy') {
                // ══════════════════════════════════════════════════════════
                // BUY: ETH → Outcome Token
                // ══════════════════════════════════════════════════════════

                // Step 1: Verify deposit (if TX hash provided)
                progress('approving', 10, 'Verifying ETH deposit...');

                if (depositTxHash) {
                    console.log(`[PrivateSwap] Verifying deposit TX: ${depositTxHash}`);
                    const receipt = await provider.getTransactionReceipt(depositTxHash);
                    if (!receipt || receipt.status !== 1) {
                        throw new Error('Deposit transaction not confirmed');
                    }
                    console.log('[PrivateSwap] Deposit verified');
                }

                // Check relayer has enough ETH to execute the swap
                const relayerBalance = await provider.getBalance(relayerWallet.address);
                console.log(`[PrivateSwap] Relayer ETH balance: ${ethers.formatEther(relayerBalance)}`);

                if (relayerBalance < amount) {
                    throw new Error(
                        `Relayer has insufficient ETH. Has ${ethers.formatEther(relayerBalance)}, needs ${ethers.formatEther(amount)}`,
                    );
                }

                // Step 2: Execute swap on factory
                progress('transferring', 40, 'Executing swap on prediction market...');

                const factoryContract = new Contract(FACTORY_ADDRESS, FACTORY_SWAP_ABI, relayerWallet);

                const swapTx = await withRetry(
                    () =>
                        factoryContract.swap(
                            marketId,
                            BigInt(tokenInIndex),
                            BigInt(tokenOutIndex),
                            amount,
                            0n, // minAmountOut (no slippage protection for demo)
                            0n, // sqrtPriceLimitX96 (no limit)
                            { value: amount, gasLimit: 500000 },
                        ),
                    'Factory swap',
                    2,
                    3000,
                );

                progress('transferring', 70, 'Waiting for swap confirmation...', {
                    txHash: swapTx.hash,
                });

                const swapReceipt = await swapTx.wait();
                console.log('[PrivateSwap] Swap confirmed:', swapTx.hash);
                console.log('[PrivateSwap] Gas used:', swapReceipt.gasUsed.toString());

                result.swapTxHash = swapTx.hash;

                // Step 3: Complete
                progress('complete', 100, 'Private buy complete!', {
                    swapTxHash: swapTx.hash,
                });

                result.success = true;
                return result;
            } else {
                // ══════════════════════════════════════════════════════════
                // SELL: Outcome Token → ETH
                // ══════════════════════════════════════════════════════════
                // TODO: Implement sell flow
                // 1. User approves & transfers outcome tokens to relayer
                // 2. Relayer calls factory.swap() to sell
                // 3. Relayer sends ETH back to user
                throw new Error('Private sell not yet implemented');
            }
        } catch (error) {
            console.error('[PrivateSwap] Failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            progress('error', 0, errorMessage);
            result.error = errorMessage;
            return result;
        }
    }

    /**
     * Execute private swap as an async generator for SSE streaming
     */
    async *executePrivateSwapStream(
        request: PrivateMarketSwapRequest,
    ): AsyncGenerator<PrivateSwapProgress> {
        const progressQueue: PrivateSwapProgress[] = [];
        let resolveWait: (() => void) | null = null;
        let isComplete = false;

        const onProgress = (progress: PrivateSwapProgress) => {
            progressQueue.push(progress);
            if (resolveWait) {
                resolveWait();
                resolveWait = null;
            }
            if (progress.step === 'complete' || progress.step === 'error') {
                isComplete = true;
            }
        };

        // Start the swap in background
        const swapPromise = this.executePrivateSwap(request, onProgress);

        // Yield progress updates as they come
        while (!isComplete) {
            if (progressQueue.length > 0) {
                yield progressQueue.shift()!;
            } else {
                await new Promise<void>(resolve => {
                    resolveWait = resolve;
                    setTimeout(resolve, 1000);
                });
            }
        }

        while (progressQueue.length > 0) {
            yield progressQueue.shift()!;
        }

        await swapPromise;
    }
}

export const privateMarketSwapService = PrivateMarketSwapService.getInstance();
