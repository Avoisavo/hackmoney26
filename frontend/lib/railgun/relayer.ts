/**
 * Server-side Relayer Service
 * 
 * Manages a funded server wallet that pays gas for RAILGUN transactions.
 * Users don't need ETH - the relayer sponsors all gas costs.
 * 
 * Security: This wallet can only pay gas, not steal user tokens.
 * Tokens flow from user's approved wallet through RAILGUN contracts.
 */

import { Wallet as EthersWallet, JsonRpcProvider } from "ethers";

// Use a SEPARATE RPC URL for the relayer to avoid sharing rate limits
// with the RAILGUN engine's heavy eth_getLogs scanning.
// RELAYER_RPC_URL > RAILGUN_RPC_URL > fallback
const RPC_URL = process.env.RELAYER_RPC_URL
  || process.env.RAILGUN_RPC_URL
  || "https://sepolia.infura.io/v3/2ede8e829bdc4f709b22c9dcf1184009";

class RelayerService {
  private static instance: RelayerService | null = null;
  private wallet: EthersWallet | null = null;
  private provider: JsonRpcProvider | null = null;

  private constructor() { }

  static getInstance(): RelayerService {
    if (!RelayerService.instance) {
      RelayerService.instance = new RelayerService();
    }
    return RelayerService.instance;
  }

  /**
   * Get the relayer wallet instance.
   * Lazily initializes the wallet from environment variable.
   */
  getWallet(): EthersWallet {
    if (!this.wallet) {
      const privateKey = process.env.RELAYER_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          "RELAYER_PRIVATE_KEY not configured. " +
          "Add a funded wallet private key to .env.local"
        );
      }

      this.provider = new JsonRpcProvider(RPC_URL);
      this.wallet = new EthersWallet(privateKey, this.provider);
      console.log('[Relayer] Initialized with address:', this.wallet.address);
    }
    return this.wallet;
  }

  /**
   * Get the relayer's public address.
   */
  getAddress(): string {
    return this.getWallet().address;
  }

  /**
   * Get the provider instance.
   */
  getProvider(): JsonRpcProvider {
    if (!this.provider) {
      this.getWallet(); // This initializes the provider
    }
    return this.provider!;
  }

  /**
   * Check if relayer is configured.
   */
  isConfigured(): boolean {
    return !!process.env.RELAYER_PRIVATE_KEY;
  }
}

export const relayerService = RelayerService.getInstance();
