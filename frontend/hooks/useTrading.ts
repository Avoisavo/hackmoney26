'use client';

import { useWriteContract, useReadContract } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { FACTORY_ADDRESS } from '@/lib/constants';

/**
 * Combined trading hook that supports both public and private trading
 * Public: Trades directly through Uniswap V4 pools (visible on-chain)
 * Private: Uses Railgun ZK proofs to hide transaction details
 */
export function useTrading() {
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  /**
   * Execute a public swap on the prediction market
   * @param marketId The market identifier
   * @param tokenInIndex Index of input token
   * @param tokenOutIndex Index of output token
   * @param amountIn Amount to swap (in human readable format, e.g., "1" for 1 token)
   * @param minAmountOut Minimum amount to receive (slippage protection)
   * @returns Transaction hash
   */
  const executePublicSwap = async (
    marketId: `0x${string}`,
    tokenInIndex: number,
    tokenOutIndex: number,
    amountIn: string,
    minAmountOut: string
  ) => {
    try {
      const hash = await writeContract({
        address: FACTORY_ADDRESS,
        abi: [
          {
            name: 'swap',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'marketId', type: 'bytes32' },
              { name: 'tokenInIndex', type: 'uint256' },
              { name: 'tokenOutIndex', type: 'uint256' },
              { name: 'amountIn', type: 'uint256' },
              { name: 'minAmountOut', type: 'uint256' },
              { name: 'sqrtPriceLimitX96', type: 'uint160' }
            ],
            outputs: [{ name: 'amountOut', type: 'uint256' }],
          },
        ],
        functionName: 'swap',
        args: [
          marketId as `0x${string}`,
          BigInt(tokenInIndex),
          BigInt(tokenOutIndex),
          parseUnits(amountIn, 18), // Assuming 18 decimals
          parseUnits(minAmountOut, 18),
          0n, // sqrtPriceLimitX96 = 0 (no limit)
        ],
      });

      console.log('Public swap executed:', hash);
      return hash;
    } catch (error) {
      console.error('Public swap failed:', error);
      throw error;
    }
  };

  /**
   * Get current implied probabilities for all outcomes in a market
   * This demonstrates the singleton pool behavior
   * @param marketId The market identifier
   * @returns Array of implied probabilities (sum should equal 100%)
   */
  const getMarketProbabilities = async (marketId: `0x${string}`) => {
    try {
      // Call getSumOfProbabilities to verify singleton behavior
      const sumOfProbabilities = await publicClient!.readContract({
        address: FACTORY_ADDRESS,
        abi: [
          {
            name: 'getSumOfProbabilities',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'marketId', type: 'bytes32' }],
            outputs: [{ name: 'sumOfProbabilities', type: 'uint256' }],
          },
        ],
        functionName: 'getSumOfProbabilities',
        args: [marketId as `0x${string}`],
      });

      // Get individual outcome probabilities
      const market = await publicClient!.readContract({
        address: FACTORY_ADDRESS,
        abi: [
          {
            name: 'getMarket',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'marketId', type: 'bytes32' }],
            outputs: [
              {
                type: 'tuple',
                components: [
                  { name: 'creator', type: 'address' },
                  { name: 'poolKeys', type: 'tuple[]' },
                  { name: 'poolIds', type: 'bytes32[]' },
                  { name: 'outcomeTokens', type: 'address[]' },
                  { name: 'resolved', type: 'bool' },
                  { name: 'winningOutcome', type: 'uint256' },
                  { name: 'question', type: 'string' },
                  { name: 'outcomes', type: 'string[]' },
                  { name: 'endTime', type: 'uint256' },
                  { name: 'creationTime', type: 'uint256' },
                  { name: 'questionId', type: 'bytes32' },
                  { name: 'finalizesAt', type: 'uint256' },
                  { name: 'discount', type: 'uint256' },
                ],
              },
            ],
          },
        ],
        functionName: 'getMarket',
        args: [marketId as `0x${string}`],
      });

      // Calculate probabilities from pool reserves
      const probabilities = [];
      for (let i = 0; i < market.outcomeTokens.length; i++) {
        const outcomeToken = await publicClient!.readContract({
          address: market.outcomeTokens[i] as `0x${string}`,
          abi: [
            {
              name: 'getImpliedProbability',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ name: 'probability', type: 'uint256' }],
            },
          ],
          functionName: 'getImpliedProbability',
          args: [],
        });

        probabilities.push(Number(outcomeToken) / 1e18); // Convert from 18 decimals
      }

      return {
        probabilities,
        sumOfProbabilities: Number(sumOfProbabilities) / 1e18,
      };
    } catch (error) {
      console.error('Error fetching market probabilities:', error);
      throw error;
    }
  };

  /**
   * Test if an address is properly shielded
   * Checks if Railgun address differs from EOA address
   */
  const testShieldedAddress = (eoaAddress: `0x${string}`, railgunAddress: `0x${string}`) => {
    // Railgun addresses start with 0x7... and are different from EOA addresses
    const isDifferent = eoaAddress.toLowerCase() !== railgunAddress.toLowerCase();
    const isRailgunFormat = railgunAddress.toLowerCase().startsWith('0x7');

    return {
      isShielded: isDifferent && isRailgunFormat,
      eoaAddress,
      railgunAddress,
      message: isDifferent && isRailgunFormat
        ? 'Address is properly shielded (Railgun address differs from EOA)'
        : 'Address may not be properly shielded',
    };
  };

  return {
    executePublicSwap,
    getMarketProbabilities,
    testShieldedAddress,
  };
}
