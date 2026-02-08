/**
 * Private Market Swap Service — RAILGUN Privacy for Prediction Markets
 *
 * FULL RAILGUN MODE (default, fastMode=false) — uses RAILGUN proxy per docs:
 *   https://docs.railgun.org/developer-guide/wallet/getting-started
 *   1. Pull WETH from user (relayer pays gas)
 *   2. Relayer shields WETH into RAILGUN proxy (tokens go to proxy, not adapter)
 *   3. Wait for POI (Proof of Innocence)
 *   4. Generate ZK unshield proof
 *   5. Relayer executes unshield from proxy to RailgunPrivacyAdapter
 *   6. Relayer calls adapter.privateSwap() → factory.buyOutcomeToken()
 *   Privacy: tokens flow through the proxy; unshield/swap not linked to user EOA.
 *
 * FAST MODE (fastMode=true) — skips proxy (demo only):
 *   Relayer transfers WETH directly to adapter. User EOA is still visible in
 *   the initial transferFrom. Use full RAILGUN mode for real privacy.
 *
 * Flow (Sell — Outcome Token → WETH): future implementation
 */

import { ethers, Contract } from 'ethers';
import {
    NetworkName,
    TXIDVersion,
    EVMGasType,
    NETWORK_CONFIG as RAILGUN_NETWORK_CONFIG,
    calculateGasPrice,
    type RailgunERC20AmountRecipient,
} from '@railgun-community/shared-models';
import {
    refreshBalances,
    balanceForERC20Token,
    walletForID,
    getShieldPrivateKeySignatureMessage,
    gasEstimateForShield,
    populateShield,
    gasEstimateForUnprovenUnshield,
    generateUnshieldProof,
    populateProvedUnshield,
} from '@railgun-community/wallet';
import { keccak256, toUtf8Bytes } from 'ethers';

import { railgunEngine } from './engine';
import { relayerService } from './relayer';
import { railgunWallet } from './wallet';
import {
    RAILGUN_ADAPTER_ADDRESS,
    SEPOLIA_WETH,
} from '../constants';
import type {
    PrivateSwapStep,
    PrivateSwapProgress,
    PrivateSwapResult,
} from './types';

// ─── Request Type ────────────────────────────────────────────────────────────

export interface PrivateMarketSwapRequest {
    userAddress: string;
    marketId: string;
    tokenInIndex: number;   // 999 = collateral (WETH), 1 = YES, 2 = NO
    tokenOutIndex: number;  // 999 = collateral (WETH), 1 = YES, 2 = NO
    amount: string;         // WETH amount in wei (string for serialization)
    action: 'buy' | 'sell';

    // Fast mode: skip RAILGUN proxy, relayer sends WETH directly to adapter (demo only).
    // Default false = use full RAILGUN flow (shield → proxy → unshield → adapter).
    fastMode?: boolean;     // default false = use proxy

    // RAILGUN wallet identity (recreated each request for serverless safety)
    senderWalletID: string;
    senderRailgunAddress: string;
    mnemonic: string;
    password: string;
}

// ─── Contract ABIs ───────────────────────────────────────────────────────────

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
];

const RAILGUN_ADAPTER_ABI = [
    'function privateSwap(bytes encryptedProof, bytes32 marketId, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 minAmountOut) returns (uint256)',
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

    private constructor() { }

    static getInstance(): PrivateMarketSwapService {
        if (!PrivateMarketSwapService.instance) {
            PrivateMarketSwapService.instance = new PrivateMarketSwapService();
        }
        return PrivateMarketSwapService.instance;
    }

    /**
     * Execute a private swap. Dispatches to full RAILGUN (proxy) or fast mode.
     * Default: full RAILGUN so tokens flow through the proxy (shield → unshield).
     */
    async executePrivateSwap(
        params: PrivateMarketSwapRequest,
        onProgress?: ProgressCallback,
    ): Promise<PrivateSwapResult> {
        const fastMode = params.fastMode === true; // default false = use proxy
        if (fastMode) {
            return this.executePrivateSwapFast(params, onProgress);
        }
        return this.executePrivateSwapFull(params, onProgress);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FAST MODE: Relayer → transfer WETH to adapter → adapter.privateSwap()
    // Privacy: user's EOA never touches factory. Factory only sees adapter.
    // ═══════════════════════════════════════════════════════════════════

    private async executePrivateSwapFast(
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
        } = params;

        const amount = BigInt(amountStr);
        const result: PrivateSwapResult = { success: false };

        const progress = (step: PrivateSwapStep, pct: number, message: string, extra?: Partial<PrivateSwapProgress>) => {
            console.log(`[PrivateSwap-Fast] ${step}: ${message} (${pct}%)`);
            onProgress?.({ step, progress: pct, message, ...extra });
        };

        try {
            if (!relayerService.isConfigured()) {
                throw new Error('Relayer not configured');
            }

            const relayerWallet = relayerService.getWallet();

            console.log('[PrivateSwap-Fast] === FAST PRIVACY SWAP STARTED ===');
            console.log(`[PrivateSwap-Fast] Action: ${action}`);
            console.log(`[PrivateSwap-Fast] Amount: ${ethers.formatEther(amount)} WETH`);
            console.log(`[PrivateSwap-Fast] Market: ${marketId}`);
            console.log(`[PrivateSwap-Fast] User: ${userAddress}`);

            if (action === 'buy') {
                // Step 1: Pull WETH from user
                progress('approving', 10, 'Pulling WETH from user...');

                const wethContract = new Contract(SEPOLIA_WETH, ERC20_ABI, relayerWallet);

                const pullTx = await withRetry(
                    () => wethContract.transferFrom(userAddress, relayerWallet.address, amount),
                    'Pull WETH',
                    4,
                    5000,
                );
                await pullTx.wait();
                console.log('[PrivateSwap-Fast] WETH pulled:', pullTx.hash);

                // Step 2: Transfer WETH from relayer to adapter
                progress('transferring', 40, 'Transferring WETH to privacy adapter...');

                const transferTx = await withRetry(
                    () => wethContract.transferFrom(relayerWallet.address, RAILGUN_ADAPTER_ADDRESS, amount),
                    'Transfer to adapter',
                    4,
                    5000,
                ).catch(async () => {
                    // transferFrom from self may not work if no self-allowance; use direct transfer
                    const iface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)']);
                    const tx = await relayerWallet.sendTransaction({
                        to: SEPOLIA_WETH,
                        data: iface.encodeFunctionData('transfer', [RAILGUN_ADAPTER_ADDRESS, amount]),
                    });
                    return tx;
                });
                await transferTx.wait();
                console.log('[PrivateSwap-Fast] WETH transferred to adapter:', transferTx.hash);

                // Step 3: Call adapter.privateSwap()
                progress('transferring', 70, 'Executing private swap on market...');

                const adapter = new Contract(RAILGUN_ADAPTER_ADDRESS, RAILGUN_ADAPTER_ABI, relayerWallet);

                // Build the proof struct (adapter verifies balance, not ZK proof content)
                const mockTimestamp = Math.floor(Date.now() / 1000);
                const nullifier = keccak256(toUtf8Bytes('nullifier_fast_' + pullTx.hash + '_' + mockTimestamp));
                const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
                    [
                        'tuple(bytes32 nullifier, bytes32 commitment, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, bytes merkleRoot, bytes32[2] balanceProofs, bytes signature)',
                    ],
                    [[
                        nullifier,
                        keccak256(toUtf8Bytes('commitment')),
                        SEPOLIA_WETH,              // tokenIn = WETH
                        ethers.ZeroAddress,         // tokenOut (adapter handles routing)
                        amount,
                        0n,
                        mockTimestamp,
                        '0x',
                        [keccak256('0x01'), keccak256('0x02')],
                        '0x',
                    ]],
                );

                const swapTx = await withRetry(
                    () => adapter.privateSwap(
                        encodedProof,
                        marketId,
                        BigInt(tokenInIndex),
                        BigInt(tokenOutIndex),
                        0n,
                        { gasLimit: 600000 },
                    ),
                    'Adapter privateSwap',
                    2,
                    3000,
                );

                const swapReceipt = await swapTx.wait();
                console.log('[PrivateSwap-Fast] Swap confirmed:', swapTx.hash);
                console.log('[PrivateSwap-Fast] Gas used:', swapReceipt.gasUsed.toString());

                result.swapTxHash = swapTx.hash;

                progress('complete', 100, 'Private buy complete!', {
                    swapTxHash: swapTx.hash,
                });

                result.success = true;
                return result;
            } else {
                throw new Error('Private sell not yet implemented');
            }
        } catch (error) {
            console.error('[PrivateSwap-Fast] Failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            progress('error', 0, errorMessage);
            result.error = errorMessage;
            return result;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FULL RAILGUN MODE: Shield → POI → ZK Proof → Unshield → Swap
    // Maximum privacy via RAILGUN privacy pool.
    // WARNING: Proof generation takes 2-10+ minutes in Node.js.
    // ═══════════════════════════════════════════════════════════════════

    private async executePrivateSwapFull(
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
            senderRailgunAddress,
            mnemonic,
            password,
        } = params;

        const amount = BigInt(amountStr);
        const result: PrivateSwapResult = { success: false };

        const progress = (step: PrivateSwapStep, pct: number, message: string, extra?: Partial<PrivateSwapProgress>) => {
            console.log(`[PrivateSwap-Full] ${step}: ${message} (${pct}%)`);
            onProgress?.({ step, progress: pct, message, ...extra });
        };

        try {
            if (!relayerService.isConfigured()) {
                throw new Error('Relayer not configured');
            }

            const relayerWallet = relayerService.getWallet();
            const provider = relayerService.getProvider();

            console.log('[PrivateSwap-Full] === FULL RAILGUN PRIVACY SWAP STARTED ===');
            console.log(`[PrivateSwap-Full] Action: ${action}`);
            console.log(`[PrivateSwap-Full] Amount: ${ethers.formatEther(amount)} WETH`);
            console.log(`[PrivateSwap-Full] Market: ${marketId}`);
            console.log(`[PrivateSwap-Full] User: ${userAddress}`);

            if (action === 'buy') {
                // STEP 1: Recreate RAILGUN wallet
                progress('preparing', 5, 'Recreating RAILGUN wallet...');

                if (!railgunEngine.isReady()) {
                    await railgunEngine.initialize();
                }

                const recreated = await railgunWallet.createWalletFromMnemonic(mnemonic, password);
                const activeWalletID = recreated.walletID;
                const encryptionKey = recreated.encryptionKey;

                const networkName = railgunEngine.getNetwork();
                const txidVersion = railgunEngine.getTxidVersion();
                const { chain } = RAILGUN_NETWORK_CONFIG[networkName];

                // STEP 2: Pull WETH & approve proxy
                progress('approving', 10, 'Pulling WETH from user...');

                const wethContract = new Contract(SEPOLIA_WETH, ERC20_ABI, relayerWallet);

                const pullTx = await withRetry(
                    () => wethContract.transferFrom(userAddress, relayerWallet.address, amount),
                    'Pull WETH',
                    2,
                    3000,
                );
                await pullTx.wait();

                progress('approving', 15, 'Approving RAILGUN proxy...');

                const railgunProxyAddress = RAILGUN_NETWORK_CONFIG[networkName]?.proxyContract;
                if (railgunProxyAddress) {
                    const currentAllowance = await wethContract.allowance(relayerWallet.address, railgunProxyAddress);
                    if (currentAllowance < amount) {
                        const approveTx = await wethContract.approve(railgunProxyAddress, ethers.MaxUint256);
                        await approveTx.wait();
                    }
                }

                // STEP 3: Shield WETH
                progress('shielding', 20, 'Shielding WETH into privacy pool...');

                const shieldRecipients: RailgunERC20AmountRecipient[] = [{
                    tokenAddress: SEPOLIA_WETH,
                    amount,
                    recipientAddress: senderRailgunAddress,
                }];

                const shieldSignatureMessage = getShieldPrivateKeySignatureMessage();
                const shieldPrivateKey = keccak256(toUtf8Bytes(shieldSignatureMessage));

                const { gasEstimate: shieldGas } = await gasEstimateForShield(
                    txidVersion, networkName, shieldPrivateKey, shieldRecipients, [], relayerWallet.address,
                );

                const feeData = await provider.getFeeData();
                const gasDetails = {
                    evmGasType: EVMGasType.Type2 as const,
                    gasEstimate: shieldGas,
                    maxFeePerGas: feeData.maxFeePerGas!,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
                };

                const { transaction: shieldTx } = await populateShield(
                    txidVersion, networkName, shieldPrivateKey, shieldRecipients, [], gasDetails as any,
                );

                const shieldRes = await relayerWallet.sendTransaction(shieldTx);
                await shieldRes.wait();
                result.inputShieldTxHash = shieldRes.hash;
                progress('shielding', 30, 'Shield complete', { inputShieldTxHash: shieldRes.hash });

                // STEP 4: Wait for POI
                progress('waiting_poi', 35, 'Waiting for POI (Privacy Verification)...');

                let spendable = BigInt(0);
                const poiStart = Date.now();
                const POI_TIMEOUT_MS = 120_000;

                while (spendable < (amount * 99n / 100n) && Date.now() - poiStart < POI_TIMEOUT_MS) {
                    await new Promise(r => setTimeout(r, 5000));
                    await refreshBalances(chain, [activeWalletID]);
                    spendable = await balanceForERC20Token(
                        txidVersion, walletForID(activeWalletID)!, networkName, SEPOLIA_WETH, true,
                    );
                    const elapsed = Date.now() - poiStart;
                    progress('waiting_poi', 35 + Math.min(15, Math.floor(elapsed / 5000) * 2),
                        `Syncing balances... (${Math.floor(elapsed / 1000)}s)`);
                }

                if (spendable < (amount * 99n / 100n)) {
                    throw new Error('POI verification timed out');
                }

                // STEP 5: Generate ZK proof
                progress('generating_proof', 55, 'Generating ZK proof...');

                const feeBps = 25n;
                const unshieldAmount = amount - (amount * feeBps / 10000n);

                // Unshield to relayer EOA first (not directly to adapter contract).
                // RAILGUN proxy reverts when unshielding to a contract address.
                // OrbitUX pattern: unshield → relayer → transfer → adapter.
                const relayerAddress = relayerWallet.address;
                const unshieldRecipients: RailgunERC20AmountRecipient[] = [{
                    tokenAddress: SEPOLIA_WETH,
                    amount: unshieldAmount,
                    recipientAddress: relayerAddress,
                }];

                // Use fresh gas details for unshield estimation (gasEstimate: 0 lets SDK calculate)
                const originalGasDetails = {
                    evmGasType: EVMGasType.Type2 as const,
                    gasEstimate: BigInt(0),
                    maxFeePerGas: feeData.maxFeePerGas ?? BigInt(50 * 10 ** 9),
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? BigInt(2 * 10 ** 9),
                };

                const { gasEstimate: unshieldGas } = await withRetry(
                    () => gasEstimateForUnprovenUnshield(
                        txidVersion, networkName, activeWalletID, encryptionKey,
                        unshieldRecipients, [], originalGasDetails, undefined, true,
                    ),
                    'Unshield gas estimation',
                    3,
                    3000,
                );

                const unshieldGasDetails = {
                    evmGasType: EVMGasType.Type2 as const,
                    gasEstimate: unshieldGas,
                    maxFeePerGas: feeData.maxFeePerGas ?? BigInt(50 * 10 ** 9),
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? BigInt(2 * 10 ** 9),
                };
                const minGasPrice = calculateGasPrice(unshieldGasDetails);

                await withRetry(
                    () => generateUnshieldProof(
                        txidVersion, networkName, activeWalletID, encryptionKey,
                        unshieldRecipients, [], undefined, true, minGasPrice,
                        (p: number) => progress('generating_proof', 55 + Math.floor(p * 0.25), `Generating proof... ${p}%`),
                    ),
                    'ZK proof generation',
                    3,
                    5000,
                );

                // STEP 6: Unshield to relayer EOA
                progress('unshielding', 82, 'Unshielding WETH to relayer...');

                const { transaction: unshieldTx } = await withRetry(
                    () => populateProvedUnshield(
                        txidVersion, networkName, activeWalletID,
                        unshieldRecipients, [], undefined, true, minGasPrice, unshieldGasDetails,
                    ),
                    'Populate unshield',
                    3,
                    2000,
                );

                // Log transaction details for debugging
                console.log('[PrivateSwap-Full] Unshield TX to:', unshieldTx.to);
                console.log('[PrivateSwap-Full] Unshield TX data length:', unshieldTx.data ? (typeof unshieldTx.data === 'string' ? unshieldTx.data.length : unshieldTx.data.length) : 0);
                console.log('[PrivateSwap-Full] Unshield TX gasLimit:', unshieldTx.gasLimit?.toString());
                console.log('[PrivateSwap-Full] Unshield recipient (relayer):', relayerAddress);

                // Send the SDK transaction directly (OrbitUX pattern)
                const unshieldRes = await relayerWallet.sendTransaction(unshieldTx);
                console.log('[PrivateSwap-Full] Unshield TX sent:', unshieldRes.hash);
                await unshieldRes.wait();
                console.log('[PrivateSwap-Full] Unshield confirmed');
                result.unshieldTxHash = unshieldRes.hash;
                progress('unshielding', 87, 'Unshield complete', { unshieldTxHash: unshieldRes.hash });

                // STEP 7: Transfer WETH from relayer to adapter
                progress('transferring', 90, 'Transferring WETH to privacy adapter...');

                const wethForTransfer = new Contract(SEPOLIA_WETH, ERC20_ABI, relayerWallet);

                // Check actual balance after unshield (RAILGUN may deduct its own fee)
                const relayerWethBalance = await wethForTransfer.balanceOf(relayerAddress);
                console.log('[PrivateSwap-Full] Relayer WETH balance after unshield:', ethers.formatEther(relayerWethBalance));
                console.log('[PrivateSwap-Full] Expected unshieldAmount:', ethers.formatEther(unshieldAmount));

                // Use actual balance if it's less than expected (handles rounding/fee differences)
                const transferAmount = relayerWethBalance < unshieldAmount ? relayerWethBalance : unshieldAmount;
                if (transferAmount === 0n) {
                    throw new Error(`Relayer has 0 WETH after unshield. Expected ~${ethers.formatEther(unshieldAmount)} WETH.`);
                }

                const transferTx = await withRetry(
                    () => wethForTransfer.transfer(RAILGUN_ADAPTER_ADDRESS, transferAmount, { gasLimit: 100000 }),
                    'Transfer WETH to adapter',
                    3,
                    3000,
                );
                await transferTx.wait();
                console.log('[PrivateSwap-Full] WETH transferred to adapter:', transferTx.hash);

                // STEP 8: Adapter swap
                progress('transferring', 95, 'Executing private swap on market...');

                const adapter = new Contract(RAILGUN_ADAPTER_ADDRESS, RAILGUN_ADAPTER_ABI, relayerWallet);

                const mockTimestamp = Math.floor(Date.now() / 1000);
                const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
                    ['tuple(bytes32 nullifier, bytes32 commitment, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, bytes merkleRoot, bytes32[2] balanceProofs, bytes signature)'],
                    [[
                        keccak256(toUtf8Bytes('nullifier' + shieldRes.hash)),
                        keccak256(toUtf8Bytes('commitment')),
                        SEPOLIA_WETH, ethers.ZeroAddress, unshieldAmount, 0n, mockTimestamp,
                        '0x', [keccak256('0x01'), keccak256('0x02')], '0x',
                    ]],
                );

                const swapTx = await withRetry(
                    () => adapter.privateSwap(encodedProof, marketId, BigInt(tokenInIndex), BigInt(tokenOutIndex), 0n, { gasLimit: 600000 }),
                    'Adapter privateSwap', 2, 3000,
                );

                const swapReceipt = await swapTx.wait();
                result.swapTxHash = swapTx.hash;
                console.log('[PrivateSwap-Full] Swap confirmed:', swapTx.hash);
                console.log('[PrivateSwap-Full] Gas used:', swapReceipt.gasUsed.toString());

                progress('complete', 100, 'Private buy complete!', {
                    inputShieldTxHash: shieldRes.hash,
                    unshieldTxHash: unshieldRes.hash,
                    swapTxHash: swapTx.hash,
                });

                result.success = true;
                return result;
            } else {
                throw new Error('Private sell not yet implemented');
            }
        } catch (error) {
            console.error('[PrivateSwap-Full] Failed:', error);
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
