'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTrading } from '@/hooks/useTrading';
import { useRailgun } from '@/contexts/RailgunContext';
import { FACTORY_ADDRESS } from '@/lib/constants';

export default function TradingTestPage() {
  const { address } = useAccount();
  const { executePublicSwap, getMarketProbabilities, testShieldedAddress } = useTrading();
  const { isInitialized, railgunWallet, initialize, createWallet } = useRailgun();

  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [tokenInIndex, setTokenInIndex] = useState(0);
  const [tokenOutIndex, setTokenOutIndex] = useState(1);
  const [amountIn, setAmountIn] = useState('1');
  const [minAmountOut, setMinAmountOut] = useState('0.95');
  const [testResults, setTestResults] = useState<any>(null);

  // Test market ID (deployed market)
  const testMarketId = '0xeb59b6b511323b3f9e86e43a987477f6663ffadd911dad8f92a96e4aadb45f96';

  const runTests = async () => {
    const results: any = {
      addressShielding: null,
      singletonPool: null,
      publicSwap: null,
      privateSwap: null,
    };

    // Test 1: Address Shielding
    if (address && railgunWallet) {
      results.addressShielding = testShieldedAddress(address, railgunWallet.railgunAddress as `0x${string}`);
    }

    // Test 2: Singleton Pool Behavior
    try {
      const probs = await getMarketProbabilities(testMarketId as `0x${string}`);
      results.singletonPool = {
        probabilities: probs.probabilities,
        sum: probs.sumOfProbabilities,
        isSingleton: Math.abs(probs.sumOfProbabilities - 1.0) < 0.01, // Within 1% tolerance
        message: Math.abs(probs.sumOfProbabilities - 1.0) < 0.01
          ? '✅ Singleton pool working: Probabilities sum to 100%'
          : `❌ Singleton pool NOT working: Probabilities sum to ${(probs.sumOfProbabilities * 100).toFixed(2)}%`,
      };
    } catch (error) {
      results.singletonPool = {
        error: 'Failed to fetch probabilities',
        details: error,
      };
    }

    setTestResults(results);
  };

  const executeSwap = async (isPrivate: boolean) => {
    try {
      if (isPrivate) {
        // Private swap through Railgun
        if (!railgunWallet) {
          alert('Please create a Railgun wallet first');
          return;
        }

        // Generate ZK proof and execute private swap
        // This would use the RailgunPrivacyAdapter contract
        alert('Private swap functionality requires deployed RailgunPrivacyAdapter contract');
      } else {
        // Public swap through Uniswap V4
        const hash = await executePublicSwap(
          testMarketId as `0x${string}`,
          tokenInIndex,
          tokenOutIndex,
          amountIn,
          minAmountOut
        );
        alert(`Public swap executed! Hash: ${hash}`);
      }
    } catch (error: any) {
      alert(`Swap failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Railgun + Uniswap V4 Integration Test</h1>

        {/* Test Configuration */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">EOA Address (Your Wallet):</label>
              <input
                type="text"
                value={address || 'Not connected'}
                disabled
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Railgun Address:</label>
              <input
                type="text"
                value={railgunWallet?.railgunAddress || 'Not created'}
                disabled
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => initialize()}
                disabled={!address || isInitialized}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
              >
                {isInitialized ? 'Railgun Initialized' : 'Initialize Railgun'}
              </button>
              <button
                onClick={() => createWallet()}
                disabled={!isInitialized}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded"
              >
                Create Railgun Wallet
              </button>
              <button
                onClick={runTests}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
              >
                Run Integration Tests
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>

            {/* Address Shielding Test */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">1. Address Shielding Test</h3>
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
                {JSON.stringify(testResults.addressShielding, null, 2)}
              </pre>
            </div>

            {/* Singleton Pool Test */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">2. Singleton Pool Test</h3>
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
                {JSON.stringify(testResults.singletonPool, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Trading Interface */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Interface</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token In Index</label>
                <input
                  type="number"
                  value={tokenInIndex}
                  onChange={(e) => setTokenInIndex(Number(e.target.value))}
                  min="0"
                  max="2"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Token Out Index</label>
                <input
                  type="number"
                  value={tokenOutIndex}
                  onChange={(e) => setTokenOutIndex(Number(e.target.value))}
                  min="0"
                  max="2"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount In</label>
                <input
                  type="text"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="1.0"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Amount Out</label>
                <input
                  type="text"
                  value={minAmountOut}
                  onChange={(e) => setMinAmountOut(e.target.value)}
                  placeholder="0.95"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => executeSwap(false)}
                disabled={!address}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold"
              >
                Execute Public Swap
              </button>
              <button
                onClick={() => executeSwap(true)}
                disabled={!railgunWallet}
                className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold"
              >
                Execute Private Swap
              </button>
            </div>

            <div className="text-sm text-gray-400">
              <p><strong>Public Swap:</strong> Transaction is visible on-chain through Uniswap V4</p>
              <p><strong>Private Swap:</strong> Transaction details hidden with ZK proofs through Railgun</p>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <strong className="text-white">1. Singleton Pool Architecture:</strong>
              <p>Multiple outcome tokens trade against collateral in separate Uniswap V4 pools. The system ensures Σ(probabilities) = 100% by coordinating pool creation and price updates.</p>
            </div>
            <div>
              <strong className="text-white">2. Address Shielding:</strong>
              <p>Railgun generates a unique shielded address (0x7...) that differs from your EOA address. All private transactions use this shielded address, protecting your identity.</p>
            </div>
            <div>
              <strong className="text-white">3. Public Trading:</strong>
              <p>Direct swaps through Uniswap V4 pools using your EOA address. All transaction details are visible on-chain.</p>
            </div>
            <div>
              <strong className="text-white">4. Private Trading:</strong>
              <p>Zero-knowledge proofs hide transaction sources, destinations, and amounts. Only the proof is visible on-chain, proving the transaction is valid without revealing details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
