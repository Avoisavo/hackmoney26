'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { initializeRailgunEngine, shutdownRailgunEngine } from '@/lib/railgun/railgun-engine';
import { loadEngineProvider } from '@/lib/railgun/railgun-network';
import {
  createRailgunWalletFromMnemonic,
  generateMnemonic,
  type RailgunWalletData,
} from '@/lib/railgun/railgun-wallet';
import { shieldTokens, unshieldTokens } from '@/lib/railgun/railgun-shield';
import {
  generatePrivateSwapProof,
  generateProofWithProgress,
  hasSufficientShieldedBalance,
  getShieldedBalances,
} from '@/lib/railgun/railgun-transactions';

interface RailgunContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  railgunWallet: RailgunWalletData | null;
  shieldedBalances: Record<string, bigint>;
  // Engine functions
  initialize: () => Promise<void>;
  // Wallet functions
  createWallet: (mnemonic?: string) => Promise<RailgunWalletData>;
  generateMnemonic: () => string;
  // Shielding functions
  shieldToken: (tokenAddress: string, amount: bigint) => Promise<any>;
  unshieldToken: (tokenAddress: string, amount: bigint, toAddress: string) => Promise<any>;
  // Transaction functions
  generateSwapProof: (tokenIn: string, tokenOut: string, amountIn: bigint, amountOut: bigint) => Promise<any>;
  hasBalance: (tokenAddress: string, amount: bigint) => Promise<boolean>;
  refreshBalances: () => Promise<void>;
}

const RailgunContext = createContext<RailgunContextType | undefined>(undefined);

/**
 * RailgunProvider component that manages Railgun SDK state and initialization
 * Wraps the application to provide Railgun functionality to all components
 */
export function RailgunProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [railgunWallet, setRailgunWallet] = useState<RailgunWalletData | null>(null);
  const [shieldedBalances, setShieldedBalances] = useState<Record<string, bigint>>({});

  /**
   * Initializes the Railgun engine with the connected wallet
   */
  const initialize = useCallback(async () => {
    if (!address) {
      throw new Error('No wallet connected');
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Initialize Railgun engine
      await initializeRailgunEngine(address);

      // Load engine provider for Sepolia
      await loadEngineProvider();

      setIsInitialized(true);
      console.log('Railgun engine initialized successfully');
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Railgun initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [address]);

  /**
   * Creates a new Railgun wallet from a mnemonic
   */
  const createWallet = useCallback(async (mnemonic?: string): Promise<RailgunWalletData> => {
    const walletMnemonic = mnemonic || generateMnemonic();

    try {
      const walletData = await createRailgunWalletFromMnemonic(walletMnemonic);
      setRailgunWallet(walletData);
      return walletData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * Shields tokens into the privacy pool
   */
  const shieldToken = useCallback(async (
    tokenAddress: string,
    amount: bigint
  ) => {
    if (!railgunWallet) {
      throw new Error('No Railgun wallet created. Please create a wallet first.');
    }

    try {
      const result = await shieldTokens(
        railgunWallet.railgunAddress,
        tokenAddress,
        amount
      );

      // Refresh balances after shielding
      await refreshBalances();

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [railgunWallet]);

  /**
   * Unshields tokens from the privacy pool
   */
  const unshieldToken = useCallback(async (
    tokenAddress: string,
    amount: bigint,
    toAddress: string
  ) => {
    if (!railgunWallet) {
      throw new Error('No Railgun wallet created.');
    }

    try {
      const result = await unshieldTokens(
        railgunWallet.railgunWalletID,
        tokenAddress,
        amount,
        toAddress
      );

      // Refresh balances after unshielding
      await refreshBalances();

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [railgunWallet]);

  /**
   * Generates a private swap proof
   */
  const generateSwapProof = useCallback(async (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    amountOut: bigint
  ) => {
    if (!railgunWallet) {
      throw new Error('No Railgun wallet created.');
    }

    try {
      const result = await generatePrivateSwapProof(
        railgunWallet.railgunWalletID,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        railgunWallet.railgunAddress
      );

      // Refresh balances after swap
      await refreshBalances();

      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, [railgunWallet]);

  /**
   * Checks if wallet has sufficient shielded balance
   */
  const hasBalance = useCallback(async (
    tokenAddress: string,
    amount: bigint
  ): Promise<boolean> => {
    if (!railgunWallet) {
      return false;
    }

    return hasSufficientShieldedBalance(
      railgunWallet.railgunWalletID,
      tokenAddress,
      amount
    );
  }, [railgunWallet]);

  /**
   * Refreshes shielded balances
   */
  const refreshBalances = useCallback(async () => {
    if (!railgunWallet) {
      return;
    }

    try {
      const balances = await getShieldedBalances(railgunWallet.railgunWalletID);
      setShieldedBalances(balances);
    } catch (err) {
      console.error('Error refreshing balances:', err);
    }
  }, [railgunWallet]);

  /**
   * Cleanup function to shut down Railgun engine when wallet disconnects
   */
  useEffect(() => {
    return () => {
      if (isInitialized) {
        shutdownRailgunEngine().catch(console.error);
      }
    };
  }, [isInitialized]);

  const value: RailgunContextType = {
    isInitialized,
    isInitializing,
    error,
    railgunWallet,
    shieldedBalances,
    initialize,
    createWallet,
    generateMnemonic,
    shieldToken,
    unshieldToken,
    generateSwapProof,
    hasBalance,
    refreshBalances,
  };

  return <RailgunContext.Provider value={value}>{children}</RailgunContext.Provider>;
}

/**
 * Hook to access Railgun context
 * Must be used within a RailgunProvider
 * @returns RailgunContextType
 */
export function useRailgun() {
  const context = useContext(RailgunContext);
  if (!context) {
    throw new Error('useRailgun must be used within RailgunProvider');
  }
  return context;
}
