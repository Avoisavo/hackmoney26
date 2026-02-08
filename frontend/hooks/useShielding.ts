'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi';
import { parseEther, formatEther, keccak256, encodePacked } from 'viem';
import { useRailgun } from '@/contexts/RailgunContext';
import { RAILGUN_ADAPTER_ADDRESS } from '@/lib/constants';
import { generateMockProof, type RailgunProof } from './useRailgunPrivacy';

/**
 * Hook for shielding/unshielding ETH
 * Enables seamless deposits to and withdrawals from the private pool
 */

const RAILGUN_SHIELDING_ABI = [
    {
        inputs: [{ name: 'commitment', type: 'bytes32' }],
        name: 'shieldETH',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'amount', type: 'uint256' },
            {
                name: 'proof',
                type: 'tuple',
                components: [
                    { name: 'nullifier', type: 'bytes32' },
                    { name: 'commitment', type: 'bytes32' },
                    { name: 'tokenIn', type: 'address' },
                    { name: 'tokenOut', type: 'address' },
                    { name: 'amountIn', type: 'uint256' },
                    { name: 'amountOut', type: 'uint256' },
                    { name: 'timestamp', type: 'uint256' },
                    { name: 'merkleRoot', type: 'bytes' },
                    { name: 'balanceProofs', type: 'bytes32[2]' },
                    { name: 'signature', type: 'bytes' }
                ]
            }
        ],
        name: 'unshieldETH',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [{ name: 'commitment', type: 'bytes32' }],
        name: 'shieldedBalances',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export interface ShieldingState {
    isShielding: boolean;
    isUnshielding: boolean;
    error: string | null;
    step: string;
}

export function useShielding() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const { railgunWallet } = useRailgun();

    const [shieldedBalance, setShieldedBalance] = useState<bigint>(0n);
    const [state, setState] = useState<ShieldingState>({
        isShielding: false,
        isUnshielding: false,
        error: null,
        step: ''
    });

    // Get commitment from railgun wallet
    const getCommitment = useCallback((): `0x${string}` | null => {
        if (!railgunWallet?.railgunAddress) return null;
        // Create commitment hash from railgun address
        return keccak256(encodePacked(['string'], [railgunWallet.railgunAddress]));
    }, [railgunWallet]);

    // Fetch shielded balance
    const refreshShieldedBalance = useCallback(async () => {
        if (!publicClient) return;

        const commitment = getCommitment();
        if (!commitment) {
            setShieldedBalance(0n);
            return;
        }

        try {
            // Match contract key calculation: keccak256(abi.encodePacked(baseCommitment, token))
            // For ETH tracking, token is address(0)
            const commitmentKey = keccak256(encodePacked(['bytes32', 'address'], [commitment, '0x0000000000000000000000000000000000000000']));

            console.log('[Shielding] Refreshing balance for commitment:', commitment);
            console.log('[Shielding] Derived commitment key:', commitmentKey);

            const balance = await publicClient.readContract({
                address: RAILGUN_ADAPTER_ADDRESS,
                abi: RAILGUN_SHIELDING_ABI,
                functionName: 'shieldedBalances',
                args: [commitmentKey]
            });

            console.log('[Shielding] Fetched balance (wei):', balance?.toString());
            setShieldedBalance(balance as bigint);
        } catch (error) {
            console.error('[Shielding] Failed to fetch shielded balance:', error);
            setShieldedBalance(0n);
        }
    }, [publicClient, getCommitment]);

    // Auto-refresh on mount and when wallet changes
    useEffect(() => {
        refreshShieldedBalance();
    }, [refreshShieldedBalance]);

    /**
     * Shield ETH - deposit to private pool
     * This is the public step that will show user's EOA
     */
    const shieldETH = useCallback(async (amount: bigint): Promise<boolean> => {
        if (!walletClient || !address) {
            setState(s => ({ ...s, error: 'Wallet not connected' }));
            return false;
        }

        const commitment = getCommitment();
        if (!commitment) {
            setState(s => ({ ...s, error: 'Railgun wallet not initialized' }));
            return false;
        }

        try {
            setState({ isShielding: true, isUnshielding: false, error: null, step: 'Shielding ETH...' });

            const hash = await walletClient.writeContract({
                address: RAILGUN_ADAPTER_ADDRESS,
                abi: RAILGUN_SHIELDING_ABI,
                functionName: 'shieldETH',
                args: [commitment],
                value: amount,
                gas: 100000n // Explicit gas limit to avoid estimation issues
            });

            setState(s => ({ ...s, step: 'Waiting for confirmation...' }));
            await publicClient?.waitForTransactionReceipt({ hash });

            // Refresh balance
            await refreshShieldedBalance();

            setState({ isShielding: false, isUnshielding: false, error: null, step: '' });
            return true;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Shielding failed';
            setState({ isShielding: false, isUnshielding: false, error: errorMsg, step: '' });
            return false;
        }
    }, [walletClient, address, publicClient, getCommitment, refreshShieldedBalance]);

    /**
     * Unshield ETH - withdraw to public wallet
     * This is the public step that will show user's EOA
     */
    const unshieldETH = useCallback(async (amount: bigint): Promise<boolean> => {
        if (!walletClient || !address) {
            setState(s => ({ ...s, error: 'Wallet not connected' }));
            return false;
        }

        const commitment = getCommitment();
        if (!commitment) {
            setState(s => ({ ...s, error: 'Railgun wallet not initialized' }));
            return false;
        }

        if (shieldedBalance < amount) {
            setState(s => ({ ...s, error: 'Insufficient shielded balance' }));
            return false;
        }

        try {
            setState({ isShielding: false, isUnshielding: true, error: null, step: 'Generating withdrawal proof...' });

            // Generate mock proof for withdrawal
            const proof = generateMockProof(
                '0x0000000000000000000000000000000000000000' as `0x${string}`, // ETH = address(0)
                '0x0000000000000000000000000000000000000000' as `0x${string}`,
                amount.toString(),
                amount.toString(),
                commitment
            );

            setState(s => ({ ...s, step: 'Unshielding ETH...' }));

            // Convert proof to contract format
            const contractProof = {
                nullifier: proof.nullifier,
                commitment: commitment,
                tokenIn: proof.tokenIn,
                tokenOut: proof.tokenOut,
                amountIn: proof.amountIn,
                amountOut: proof.amountOut,
                timestamp: BigInt(proof.timestamp),
                merkleRoot: proof.merkleRoot,
                balanceProofs: proof.balanceProofs,
                signature: proof.signature
            };

            const hash = await walletClient.writeContract({
                address: RAILGUN_ADAPTER_ADDRESS,
                abi: RAILGUN_SHIELDING_ABI,
                functionName: 'unshieldETH',
                args: [amount, contractProof]
            });

            setState(s => ({ ...s, step: 'Waiting for confirmation...' }));
            await publicClient?.waitForTransactionReceipt({ hash });

            // Refresh balance
            await refreshShieldedBalance();

            setState({ isShielding: false, isUnshielding: false, error: null, step: '' });
            return true;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unshielding failed';
            setState({ isShielding: false, isUnshielding: false, error: errorMsg, step: '' });
            return false;
        }
    }, [walletClient, address, publicClient, getCommitment, shieldedBalance, refreshShieldedBalance]);

    /**
     * Check if user needs to shield more ETH for a trade
     */
    const needsShielding = useCallback((requiredAmount: bigint): boolean => {
        return shieldedBalance < requiredAmount;
    }, [shieldedBalance]);

    /**
     * Calculate how much more ETH needs to be shielded
     */
    const amountToShield = useCallback((requiredAmount: bigint): bigint => {
        if (shieldedBalance >= requiredAmount) return 0n;
        return requiredAmount - shieldedBalance;
    }, [shieldedBalance]);

    return {
        shieldedBalance,
        shieldedBalanceFormatted: formatEther(shieldedBalance),
        shieldETH,
        unshieldETH,
        refreshShieldedBalance,
        needsShielding,
        amountToShield,
        isShielding: state.isShielding,
        isUnshielding: state.isUnshielding,
        error: state.error,
        step: state.step,
        commitment: getCommitment()
    };
}
