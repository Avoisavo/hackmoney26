'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, usePublicClient, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useRailgunWallet } from '@/hooks/useRailgunWallet';
import { useRailgunEngine } from '@/hooks/useRailgunEngine';
import { usePrivateTransfer, type TransferRecipient } from '@/hooks/usePrivateTransfer';
import { usePublicTransfer, type PublicTransferRecipient } from '@/hooks/usePublicTransfer';
import { SEPOLIA_USDC } from '@/lib/constants';

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export default function PrivacyTestPage() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const {
    status: engineStatus,
    initialize: initializeEngine,
  } = useRailgunEngine();

  const {
    status: walletStatus,
    wallet: railgunWallet,
    generateMnemonic,
    createWallet,
  } = useRailgunWallet();

  const {
    isTransferring: isPrivateTransferring,
    progress: privateProgress,
    result: privateResult,
    executePrivateTransfer,
    resetTransfer: resetPrivateTransfer,
  } = usePrivateTransfer();

  const {
    isTransferring: isPublicTransferring,
    result: publicResult,
    executePublicTransfer,
    resetTransfer: resetPublicTransfer,
  } = usePublicTransfer();

  // State
  const [stealthMode, setStealthMode] = useState(true);
  const [recipients, setRecipients] = useState<TransferRecipient[]>([
    { amount: '0.01', address: '', token: 'USDC' }
  ]);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [showWalletSetup, setShowWalletSetup] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{ symbol: string; decimals: number } | null>(null);

  const isTransferring = stealthMode ? isPrivateTransferring : isPublicTransferring;

  // Log progress changes in real-time
  const lastProgressRef = useRef<string>('');
  useEffect(() => {
    if (stealthMode && privateProgress.step !== 'idle' && privateProgress.step !== 'error') {
      const progressKey = `${privateProgress.step}-${privateProgress.progress}`;
      if (progressKey !== lastProgressRef.current) {
        lastProgressRef.current = progressKey;
        const logMsg = `[${privateProgress.progress}%] ${privateProgress.message}${privateProgress.details ? ` - ${privateProgress.details}` : ''}`;
        console.log('[Page] Progress:', logMsg);
        // Only add important steps to the log to avoid spam
        if (['signing', 'approving', 'shielding', 'waiting_poi', 'generating_proof', 'unshielding', 'complete', 'error'].includes(privateProgress.step)) {
          addLog(logMsg);
        }
      }
    }
  }, [privateProgress, stealthMode]);
  const tokenAddress = SEPOLIA_USDC;

  // Add log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(`[Railgun Test] ${message}`);
  };

  // Load token info
  useEffect(() => {
    const loadTokenInfo = async () => {
      if (!tokenAddress || !publicClient) return;

      try {
        const [symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
        ]);
        setTokenInfo({ symbol: symbol as string, decimals: Number(decimals) });
        addLog(`Loaded token info: ${symbol} (${decimals} decimals)`);
      } catch (error) {
        addLog(`Error loading token info: ${error}`);
        addLog(`Make sure you're connected to Sepolia testnet!`);
        addLog(`Token address: ${tokenAddress}`);
        // Set default token info so UI doesn't break
        setTokenInfo({ symbol: 'USDC', decimals: 6 });
      }
    };

    loadTokenInfo();
  }, [tokenAddress, publicClient]);

  // Load wallet balance
  useEffect(() => {
    const loadBalance = async () => {
      if (!address || !tokenAddress) return;

      try {
        const balance = await publicClient?.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        setTokenBalance((balance as bigint) || 0n);
      } catch (error) {
        addLog(`Error loading balance: ${error}`);
      }
    };

    loadBalance();
  }, [address, tokenAddress, publicClient]);

  // Initialize Railgun engine on mount
  useEffect(() => {
    if (engineStatus === 'uninitialized') {
      initializeEngine();
    }
  }, [engineStatus, initializeEngine]);

  // Quick setup
  const handleQuickSetup = async () => {
    if (!address) {
      addLog('Please connect your wallet first');
      return;
    }

    addLog('=== Starting Quick Setup ===');

    // Step 1: Initialize Railgun
    if (engineStatus !== 'ready') {
      addLog('Initializing Railgun engine (this may take 30-60 seconds on first run)...');
      try {
        await initializeEngine();
        addLog('✓ Engine initialization started, waiting for readiness...');

        // Poll for engine to be ready (up to 90 seconds)
        const maxWait = 90000;
        const pollInterval = 3000;
        let attempts = 0;
        const maxAttempts = maxWait / pollInterval;

        while (attempts < maxAttempts) {
          attempts++;
          addLog(`Checking engine status... (attempt ${attempts}/${maxAttempts})`);

          const response = await fetch('/api/railgun/init');
          const data = await response.json();

          if (data.status === 'ready') {
            addLog('✓ Railgun engine ready!');
            break;
          } else if (data.status === 'error') {
            addLog(`✗ Engine error: ${data.error}`);
            return;
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        if (attempts >= maxAttempts) {
          addLog('✗ Engine initialization timeout (took too long)');
          addLog('Please try again or check server logs');
          return;
        }
      } catch (error: any) {
        addLog(`✗ Engine initialization failed: ${error.message}`);
        return;
      }
    }

    // Step 2: Create wallet
    if (walletStatus !== 'ready') {
      addLog('Creating Railgun wallet...');
      const mnemonic = generateMnemonic();
      addLog(`Generated mnemonic (save this!): ${mnemonic}`);

      try {
        await createWallet(mnemonic, 'test-password');
        addLog('✓ Railgun wallet created successfully!');
      } catch (error: any) {
        addLog(`✗ Wallet creation failed: ${error.message}`);
        addLog('This might be due to missing RELAYER_PRIVATE_KEY in .env.local');
        return;
      }
    }

    // Step 3: Check balance
    if (tokenBalance === 0n) {
      addLog(`WARNING: You have 0 ${tokenInfo?.symbol || 'tokens'}. Get tokens from faucet.`);
      addLog('Sepolia ETH faucet: https://sepoliafaucet.com/');
    }

    addLog('=== Setup Complete ===');
    addLog('Your Railgun wallet is ready for private transactions!');
  };

  // Update recipient
  const updateRecipient = (index: number, field: keyof TransferRecipient, value: string) => {
    setRecipients(recipients.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Check if can send
  const canSend = () => {
    if (!address) return false;
    if (stealthMode && walletStatus !== 'ready') return false;
    if (recipients.length === 0) return false;
    const total = recipients.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
    if (total <= 0) return false;
    return recipients.every(r => /^0x[a-fA-F0-9]{40}$/.test(r.address) && parseFloat(r.amount || '0') > 0);
  };

  // Handle send
  const handleSend = async () => {
    if (!canSend()) return;

    if (stealthMode) {
      // Private transfer via RAILGUN
      try {
        addLog('Starting private transfer...');
        console.log('[Page] Starting private transfer with recipients:', recipients);
        await executePrivateTransfer(recipients);
        addLog('✓ Private transfer complete!');
      } catch (error: any) {
        console.error('[Page] Private transfer error:', error);
        addLog(`✗ Private transfer failed: ${error.message}`);
      }
    } else {
      // Public transfer
      const publicRecipients: PublicTransferRecipient[] = recipients.map(r => ({
        address: r.address,
        amount: r.amount,
        token: r.token,
      }));

      try {
        await executePublicTransfer(publicRecipients);
        addLog('Public transfer initiated!');
      } catch (error: any) {
        addLog(`Public transfer failed: ${error.message}`);
      }
    }
  };

  // Get totals
  const getTotalsByToken = () => {
    const totals: Record<string, number> = {};
    recipients.forEach(r => {
      const amount = parseFloat(r.amount) || 0;
      const tokenSymbol = r.token || 'UNKNOWN';
      totals[tokenSymbol] = (totals[tokenSymbol] || 0) + amount;
    });
    return totals;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Railgun Privacy Test Suite
          </h1>
          <p className="text-gray-400">
            Execute real private transactions with zero-knowledge proofs
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Network Status */}
              <div className="text-sm">
                {chainId === sepolia.id ? (
                  <span className="text-green-400">✓ Sepolia</span>
                ) : (
                  <span className="text-red-400">⚠️ Wrong Network (ID: {chainId})</span>
                )}
              </div>

              {/* Wallet Status */}
              <div className="text-sm text-gray-400">
                <div>EOA: {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}</div>
                {railgunWallet && (
                  <div className="text-purple-400">
                    Railgun: {railgunWallet.railgunAddress.slice(0, 10)}...
                  </div>
                )}
              </div>

              {/* Engine Status */}
              {engineStatus === 'initializing' && (
                <div className="text-sm text-yellow-400">
                  Initializing RAILGUN...
                </div>
              )}
            </div>

            <div className="text-sm">
              <span className="text-gray-400">Balance:</span>{' '}
              <span className="font-mono text-green-400">
                {tokenInfo && `${(Number(tokenBalance) / 10 ** tokenInfo.decimals).toFixed(4)} ${tokenInfo.symbol}`}
              </span>
            </div>

            {/* Stealth Mode Toggle */}
            <button
              onClick={() => setStealthMode(!stealthMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${stealthMode
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-600 hover:bg-gray-700'
                }`}
            >
              {stealthMode ? '🔐 Stealth Mode' : '👁️ Public Mode'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleQuickSetup}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-4 rounded-xl font-semibold shadow-lg"
          >
            🚀 Quick Setup
          </button>

          {stealthMode && walletStatus !== 'ready' && (
            <button
              onClick={() => setShowWalletSetup(true)}
              className="bg-green-600 hover:bg-green-700 px-6 py-4 rounded-xl font-semibold"
            >
              🔑 Setup Railgun Wallet
            </button>
          )}
        </div>

        {/* Recipients */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            {stealthMode ? '🔐 Private Transfer' : '👁️ Public Transfer'}
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {stealthMode
              ? 'Your EOA will NOT be visible on-chain'
              : 'Standard transfer (publicly visible)'}
          </p>

          <div className="space-y-4">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-4 items-center bg-gray-700 p-4 rounded-lg">
                <input
                  type="text"
                  value={recipient.address}
                  onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                  placeholder="0x... recipient address"
                  className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-2 font-mono text-sm"
                />
                <input
                  type="number"
                  value={recipient.amount}
                  onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                  placeholder="0.0"
                  className="w-32 bg-gray-600 border border-gray-500 rounded px-3 py-2"
                  step="0.000001"
                  min="0"
                />
                <span className="text-gray-400">{recipient.token}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-400">Total Amount</div>
            <div className="text-xl font-bold text-purple-400">
              {Object.entries(getTotalsByToken()).map(([token, amount]) => (
                <span key={token} className="mr-4">
                  {amount.toLocaleString()} {token}
                </span>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend() || isTransferring}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded-xl font-semibold"
          >
            {isTransferring ? 'Processing...' : stealthMode ? 'Send Privately' : 'Send Publicly'}
          </button>

          {/* Progress */}
          {isTransferring && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                  style={{ width: `${privateProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">{privateProgress.message}</p>
            </div>
          )}
        </div>

        {/* Console Log */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Activity Log</h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="h-48 overflow-y-auto space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No activity yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-gray-300 whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-semibold mb-3">🔐 How Private Transactions Work</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-purple-400">1. Setup:</strong> Create a Railgun wallet from your mnemonic</p>
            <p><strong className="text-purple-400">2. Shield:</strong> Tokens are deposited into the privacy pool (relayer pays gas)</p>
            <p><strong className="text-purple-400">3. Transfer:</strong> ZK proofs hide transaction details on-chain</p>
            <p><strong className="text-purple-400">4. Unshield:</strong> Recipient receives tokens privately (relayer pays gas)</p>
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-400">
                ⚠️ <strong>Note:</strong> This testnet is for development. Get testnet tokens from faucets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
