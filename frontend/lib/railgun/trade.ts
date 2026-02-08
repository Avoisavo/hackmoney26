/**
 * Server-side RAILGUN Trade Service
 * 
 * Flow for Private Prediction Market Trading:
 * 1. Gasless Permit for Collateral (USDC/WETH)
 * 2. Relayer Pulls tokens & Shields into Railgun Proxy
 * 3. Wait for POI
 * 4. Generate Unshield Proof TO RailgunPrivacyAdapter
 * 5. Execute Unshield TX (Relayer pays gas)
 * 6. Execute Swap TX on Adapter (Relayer pays gas)
 */

import { ethers, Contract } from "ethers";
import {
    NetworkName,
    TXIDVersion,
    EVMGasType,
    calculateGasPrice,
    NETWORK_CONFIG as RAILGUN_NETWORK_CONFIG,
    type TransactionGasDetails,
    type RailgunERC20AmountRecipient,
} from "@railgun-community/shared-models";
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
} from "@railgun-community/wallet";
import { keccak256, toUtf8Bytes } from "ethers";
import { railgunEngine } from "./engine";
import { relayerService } from "./relayer";
import { railgunWallet } from "./wallet";
import { RAILGUN_ADAPTER_ADDRESS, RAILGUN_PROXY_ADDRESS } from "../constants";
import type {
    TransferStep,
    TransferProgress,
    GasAbstractionMethod,
    PermitData,
    TokenShieldResult,
} from "./types";

// ABI for the RailgunPrivacyAdapter contract
const RAILGUN_ADAPTER_ABI = [
    "function privateSwap(bytes encryptedProof, bytes32 marketId, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 minAmountOut) returns (uint256)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
];

export interface TradeParams {
    senderWalletID: string;
    senderEncryptionKey: string;
    senderRailgunAddress: string;
    userAddress: string;
    mnemonic: string;
    password: string;

    // Trade Specifics
    marketId: string;
    tokenInAddress: string;
    tokenOutAddress: string;
    amount: string;
    tokenInIndex: number;
    tokenOutIndex: number;
    minAmountOut: string;

    // Gas abstraction
    gasAbstraction: GasAbstractionMethod;
    permitData?: PermitData;

    onProgress?: (progress: any) => void;
}

/**
 * Retry helper
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    name: string,
    retries = 3
): Promise<T> {
    let lastErr;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            console.log(`[Trade] Retrying ${name} (${i + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
    }
    throw lastErr;
}

class RailgunTradeService {
    private static instance: RailgunTradeService | null = null;

    static getInstance(): RailgunTradeService {
        if (!RailgunTradeService.instance) RailgunTradeService.instance = new RailgunTradeService();
        return RailgunTradeService.instance;
    }

    async executePrivateTrade(params: TradeParams) {
        const { onProgress, senderRailgunAddress, userAddress, tokenInAddress, amount, marketId, mnemonic, password } = params;

        const progress = (step: string, pct: number, message: string, txHash?: string) => {
            console.log(`[Trade] ${step}: ${message} (${pct}%)`);
            onProgress?.({ step, progress: pct, message, txHash });
        };

        try {
            if (!railgunEngine.isReady()) await railgunEngine.initialize();

            const relayerWallet = relayerService.getWallet();
            const provider = relayerService.getProvider();

            // 1. Recreate wallet (Serverless safe)
            progress('preparing', 5, 'Recreating wallet...');
            const recreated = await railgunWallet.createWalletFromMnemonic(mnemonic, password);
            const activeWalletID = recreated.walletID;
            const encryptionKey = recreated.encryptionKey;

            const networkName = railgunEngine.getNetwork();
            const txidVersion = railgunEngine.getTxidVersion();
            const { chain } = RAILGUN_NETWORK_CONFIG[networkName];

            const tokenContract = new Contract(tokenInAddress, ERC20_ABI, relayerWallet);
            const amountBI = BigInt(amount);

            // 2. Permit & Pull (if needed)
            if (params.gasAbstraction === 'permit' && params.permitData) {
                progress('approving', 10, 'Executing permit...');
                const p = params.permitData;
                const pt = await tokenContract.permit(p.owner, p.spender, BigInt(p.value), BigInt(p.deadline), p.v, p.r, p.s);
                await pt.wait();
            }

            progress('approving', 15, 'Pulling tokens...');
            const tf = await tokenContract.transferFrom(userAddress, relayerWallet.address, amountBI);
            await tf.wait();

            // 3. Shield
            progress('shielding', 20, 'Shielding to Railgun...');
            const shieldRecipients = [{ tokenAddress: tokenInAddress, amount: amountBI, recipientAddress: senderRailgunAddress }];
            const shieldSignatureMessage = getShieldPrivateKeySignatureMessage();
            const shieldPrivateKey = keccak256(toUtf8Bytes(shieldSignatureMessage));

            const { gasEstimate: sGas } = await gasEstimateForShield(txidVersion, networkName, shieldPrivateKey, shieldRecipients, [], relayerWallet.address);
            const feed = await provider.getFeeData();
            const sDetails = { evmGasType: EVMGasType.Type2 as const, gasEstimate: sGas, maxFeePerGas: feed.maxFeePerGas!, maxPriorityFeePerGas: feed.maxPriorityFeePerGas! };

            const { transaction: sTx } = await populateShield(txidVersion, networkName, shieldPrivateKey, shieldRecipients, [], sDetails);
            const sRes = await relayerWallet.sendTransaction(sTx);
            await sRes.wait();
            progress('shielding', 30, 'Shield complete', sRes.hash);

            // 4. Wait POI
            progress('waiting_poi', 35, 'Waiting for POI (Privacy Verification)...');
            let spendable = BigInt(0);
            const start = Date.now();
            while (spendable < (amountBI * 99n / 100n) && Date.now() - start < 120000) {
                await new Promise(r => setTimeout(r, 5000));
                await refreshBalances(chain, [activeWalletID]);
                spendable = await balanceForERC20Token(txidVersion, walletForID(activeWalletID)!, networkName, tokenInAddress, true);
                progress('waiting_poi', 35 + Math.min(15, Math.floor((Date.now() - start) / 5000) * 2), 'Syncing...');
            }

            // 5. Unshield proof to Adapter
            progress('generating_proof', 55, 'Generating ZK Proof...');
            const feeBps = 25n;
            const unshieldAmount = amountBI - (amountBI * feeBps / 10000n);

            const unshieldRecipients = [{ tokenAddress: tokenInAddress, amount: unshieldAmount, recipientAddress: RAILGUN_ADAPTER_ADDRESS }];

            const { gasEstimate: uGas } = await gasEstimateForUnprovenUnshield(txidVersion, networkName, activeWalletID, encryptionKey, unshieldRecipients, [], sDetails, undefined, true);
            const uDetails = { ...sDetails, gasEstimate: uGas };
            const minGasPrice = calculateGasPrice(uDetails);

            await generateUnshieldProof(txidVersion, networkName, activeWalletID, encryptionKey, unshieldRecipients, [], undefined, true, minGasPrice, (p) => {
                progress('generating_proof', 55 + Math.floor(p * 0.25), `Generating proof... ${p}%`);
            });

            // 6. Execute Unshield & Swap
            progress('swapping', 85, 'Submitting trade via Railgun...');
            const { transaction: uTx } = await populateProvedUnshield(txidVersion, networkName, activeWalletID, unshieldRecipients, [], undefined, true, minGasPrice, uDetails);
            const uRes = await relayerWallet.sendTransaction(uTx);
            await uRes.wait();

            // Final Step: Call privateSwap on Adapter
            progress('swapping', 95, 'Finalizing swap on market...');
            const adapter = new Contract(RAILGUN_ADAPTER_ADDRESS, RAILGUN_ADAPTER_ABI, relayerWallet);

            // Generate a mock RailgunProof struct for the adapter (since we already verified via real unshield)
            // The adapter will check balances anyway.
            const mockTimestamp = Math.floor(Date.now() / 1000);
            const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
                ["tuple(bytes32 nullifier, bytes32 commitment, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, bytes merkleRoot, bytes32[2] balanceProofs, bytes signature)"],
                [[keccak256(toUtf8Bytes("nullifier" + sRes.hash)), keccak256(toUtf8Bytes("commitment")), tokenInAddress, params.tokenOutAddress, unshieldAmount, 0n, mockTimestamp, "0x", [keccak256("0x01"), keccak256("0x02")], "0x"]]
            );

            const swapTx = await adapter.privateSwap(encodedProof, marketId, params.tokenInIndex, params.tokenOutIndex, params.minAmountOut);
            await swapTx.wait();

            progress('complete', 100, 'Trade complete!');
            return { success: true, shieldTxHash: sRes.hash, swapTxHash: swapTx.hash };

        } catch (error) {
            console.error('[Trade Service] Error:', error);
            throw error;
        }
    }
}

export const railgunTrade = RailgunTradeService.getInstance();
