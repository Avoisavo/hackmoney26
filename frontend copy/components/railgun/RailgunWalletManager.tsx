'use client';

import React, { useState } from 'react';
import { useRailgun } from '@/contexts/RailgunContext';
import { formatTokenAmount } from '@/lib/railgun/railgun-shield';

/**
 * RailgunWalletManager component
 * Provides UI for creating and managing Railgun privacy wallets
 */
export function RailgunWalletManager() {
  const {
    railgunWallet,
    shieldedBalances,
    createWallet,
    generateMnemonic,
    shieldToken,
    refreshBalances,
    isInitialized,
  } = useRailgun();

  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [shieldAmount, setShieldAmount] = useState('');
  const [shieldTokenAddress, setShieldTokenAddress] = useState('0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B'); // Mock USDC on Sepolia
  const [isCreating, setIsCreating] = useState(false);
  const [isShielding, setIsShielding] = useState(false);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      await createWallet(mnemonicInput || undefined);
      setShowCreateWallet(false);
      setMnemonicInput('');
    } catch (error) {
      console.error('Failed to create wallet:', error);
      alert('Failed to create wallet: ' + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateMnemonic = () => {
    setMnemonicInput(generateMnemonic());
  };

  const handleShieldTokens = async () => {
    if (!shieldAmount) {
      alert('Please enter an amount to shield');
      return;
    }

    setIsShielding(true);
    try {
      // Shield 1 USDC (6 decimals) by default
      const amount = BigInt(parseFloat(shieldAmount) * 10 ** 6);
      await shieldToken(shieldTokenAddress, amount);
      alert('Tokens shielded successfully!');
      setShieldAmount('');
    } catch (error) {
      console.error('Failed to shield tokens:', error);
      alert('Failed to shield tokens: ' + (error as Error).message);
    } finally {
      setIsShielding(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ Railgun engine not initialized. Please initialize Railgun first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet Status */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Railgun Privacy Wallet</h3>
        {railgunWallet ? (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Wallet ID:</span>{' '}
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {railgunWallet.railgunWalletID.slice(0, 8)}...{railgunWallet.railgunWalletID.slice(-8)}
              </code>
            </p>
            <p className="text-sm">
              <span className="font-medium">Railgun Address:</span>{' '}
              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                {railgunWallet.railgunAddress}
              </code>
            </p>
            <button
              onClick={refreshBalances}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🔄 Refresh Balances
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No wallet created yet.</p>
        )}
      </div>

      {/* Create Wallet Section */}
      {!railgunWallet && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Create Privacy Wallet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create a Railgun wallet to enable private transactions
          </p>
          {!showCreateWallet ? (
            <button
              onClick={() => setShowCreateWallet(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mnemonic Phrase (optional)
                </label>
                <textarea
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="Enter 12 or 24 word mnemonic, or generate a new one"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateMnemonic}
                  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Generate New
                </button>
                <button
                  onClick={() => setShowCreateWallet(false)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWallet}
                  disabled={isCreating || !mnemonicInput}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isCreating ? 'Creating...' : 'Create Wallet'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shield Tokens Section */}
      {railgunWallet && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Shield Tokens</h3>
          <p className="text-sm text-gray-600 mb-4">
            Deposit tokens into the privacy pool to enable private transactions
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={shieldAmount}
                onChange={(e) => setShieldAmount(e.target.value)}
                placeholder="1.0"
                className="w-full p-2 border border-gray-300 rounded text-sm"
                min="0"
                step="0.000001"
              />
            </div>
            <button
              onClick={handleShieldTokens}
              disabled={isShielding || !shieldAmount}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isShielding ? 'Shielding...' : 'Shield Tokens'}
            </button>
          </div>
        </div>
      )}

      {/* Shielded Balances */}
      {railgunWallet && Object.keys(shieldedBalances).length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Shielded Balances</h3>
          <div className="space-y-1">
            {Object.entries(shieldedBalances).map(([token, balance]) => (
              <div key={token} className="flex justify-between text-sm">
                <span className="font-mono text-xs">{token.slice(0, 8)}...</span>
                <span className="font-medium">{formatTokenAmount(balance, 6)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
