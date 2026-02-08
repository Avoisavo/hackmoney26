import {
  loadProvider,
} from '@railgun-community/wallet';
import { FallbackProviderJsonConfig, NetworkName } from '@railgun-community/shared-models';
import { getRailgunNetworkName } from './railgun-provider';

/**
 * Loads the Railgun engine provider for Sepolia testnet
 * Configures fallback provider settings and connects to the network
 * Balance scanning happens automatically after the provider is loaded
 * @returns Promise that resolves when provider is loaded
 */
export const loadEngineProvider = async () => {
  try {
    console.log('[Railgun] Loading provider for Sepolia...');

    const networkName = getRailgunNetworkName();

    // Use Alchemy as primary (most reliable) with public RPCs as fallbacks
    const rpcUrls = [
      'https://eth-sepolia.g.alchemy.com/v2/NZ3yyZn9pr6AJTznkuWPC', // Alchemy (highest priority)
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
      'https://1rpc.io/sepolia',
    ];

    // Create provider config - Railgun requires exact format
    const providerConfig: FallbackProviderJsonConfig = {
      chainId: 11155111,
      providers: rpcUrls.map((url, index) => ({
        provider: url,
        priority: index + 1,
        weight: 1,
        maxLogsPerBatch: 5,
      })),
    };

    console.log('[Railgun] Loading provider with Alchemy +', rpcUrls.length - 1, 'fallback RPCs');

    // Load provider with 5 minute polling interval
    await loadProvider(providerConfig, networkName, 300000);

    console.log('[Railgun] Provider loaded successfully!');
  } catch (error) {
    console.error('[Railgun] Error loading provider:', error);
    throw error;
  }
};

