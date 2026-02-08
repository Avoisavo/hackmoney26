'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRailgunWallet } from './useRailgunWallet';
import { SEPOLIA_WETH } from '@/lib/constants';

/**
 * Position tracking for private trades
 * Tracks shielded balances of outcome tokens
 */

export interface Position {
    marketId: `0x${string}`;
    side: 'YES' | 'NO';
    shares: bigint;
    tokenAddress: `0x${string}`;
    averagePrice: number;
    totalCost: bigint;
}

export interface PositionSummary {
    totalPositions: number;
    totalValue: bigint;
    positions: Position[];
}

/**
 * Hook to track private positions
 * In demo mode, positions are stored in localStorage
 * In production, they would be queried from shielded balances
 */
export function usePrivatePositions() {
    const { wallet: railgunWallet } = useRailgunWallet();
    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load positions from localStorage (demo mode)
    useEffect(() => {
        if (!railgunWallet) return;

        const loadPositions = () => {
            try {
                const stored = localStorage.getItem(`positions_${railgunWallet.railgunAddress}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Convert string bigints back to BigInt
                    const positions = parsed.map((p: any) => ({
                        ...p,
                        shares: BigInt(p.shares),
                        totalCost: BigInt(p.totalCost),
                    }));
                    setPositions(positions);
                }
            } catch (error) {
                console.error('Failed to load positions:', error);
            }
        };

        loadPositions();
    }, [railgunWallet]);

    // Save positions to localStorage
    const savePositions = useCallback((newPositions: Position[]) => {
        if (!railgunWallet) return;

        try {
            // Convert BigInt to string for JSON serialization
            const serializable = newPositions.map(p => ({
                ...p,
                shares: p.shares.toString(),
                totalCost: p.totalCost.toString(),
            }));
            localStorage.setItem(`positions_${railgunWallet.railgunAddress}`, JSON.stringify(serializable));
            setPositions(newPositions);
        } catch (error) {
            console.error('Failed to save positions:', error);
        }
    }, [railgunWallet]);

    /**
     * Add a new position or update existing one
     */
    const addPosition = useCallback((
        marketId: `0x${string}`,
        side: 'YES' | 'NO',
        shares: bigint,
        tokenAddress: `0x${string}`,
        cost: bigint
    ) => {
        setPositions(current => {
            // Find existing position for this market and side
            const existingIndex = current.findIndex(
                p => p.marketId === marketId && p.side === side
            );

            if (existingIndex >= 0) {
                // Update existing position
                const existing = current[existingIndex];
                const newShares = existing.shares + shares;
                const newTotalCost = existing.totalCost + cost;
                const newAveragePrice = Number(newTotalCost) / Number(newShares);

                const updated = [...current];
                updated[existingIndex] = {
                    ...existing,
                    shares: newShares,
                    totalCost: newTotalCost,
                    averagePrice: newAveragePrice,
                };

                savePositions(updated);
                return updated;
            } else {
                // Add new position
                const newPosition: Position = {
                    marketId,
                    side,
                    shares,
                    tokenAddress,
                    totalCost: cost,
                    averagePrice: Number(cost) / Number(shares),
                };

                const updated = [...current, newPosition];
                savePositions(updated);
                return updated;
            }
        });
    }, [savePositions]);

    /**
     * Reduce a position (when selling)
     */
    const reducePosition = useCallback((
        marketId: `0x${string}`,
        side: 'YES' | 'NO',
        shares: bigint
    ) => {
        setPositions(current => {
            const existingIndex = current.findIndex(
                p => p.marketId === marketId && p.side === side
            );

            if (existingIndex < 0) {
                console.warn('Position not found for reduction');
                return current;
            }

            const existing = current[existingIndex];
            const newShares = existing.shares - shares;

            if (newShares <= 0n) {
                // Remove position entirely
                const updated = current.filter((_, i) => i !== existingIndex);
                savePositions(updated);
                return updated;
            } else {
                // Reduce shares, keep average price the same
                const updated = [...current];
                updated[existingIndex] = {
                    ...existing,
                    shares: newShares,
                    totalCost: BigInt(Math.floor(Number(newShares) * existing.averagePrice)),
                };

                savePositions(updated);
                return updated;
            }
        });
    }, [savePositions]);

    /**
     * Get position for a specific market and side
     */
    const getPosition = useCallback((
        marketId: `0x${string}`,
        side: 'YES' | 'NO'
    ): Position | null => {
        return positions.find(p => p.marketId === marketId && p.side === side) || null;
    }, [positions]);

    /**
     * Get total position summary
     */
    const getSummary = useCallback((): PositionSummary => {
        const totalValue = positions.reduce((sum, p) => sum + p.totalCost, 0n);

        return {
            totalPositions: positions.length,
            totalValue,
            positions,
        };
    }, [positions]);

    /**
     * Clear all positions (for testing)
     */
    const clearPositions = useCallback(() => {
        if (!railgunWallet) return;
        localStorage.removeItem(`positions_${railgunWallet.railgunAddress}`);
        setPositions([]);
    }, [railgunWallet]);

    return {
        positions,
        isLoading,
        addPosition,
        reducePosition,
        getPosition,
        getSummary,
        clearPositions,
    };
}
