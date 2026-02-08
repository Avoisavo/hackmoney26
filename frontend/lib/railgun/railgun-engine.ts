import {
  startRailgunEngine,
  stopRailgunEngine,
} from '@railgun-community/wallet';
import { createRailgunDatabase } from './railgun-database';
import { createBrowserArtifactStore } from './railgun-artifacts';

// Global flag to track if prover is set
let proverSet = false;

/**
 * Initializes the Railgun privacy engine
 * Sets up the database, artifact store, and Groth16 prover for ZK proof generation
 * @param walletAddress - The wallet address to use for Railgun initialization
 * @returns Promise that resolves when engine is initialized
 */
export const initializeRailgunEngine = async (walletAddress: string) => {
  try {
    console.log('[Railgun] Initializing engine...');

    const db = createRailgunDatabase();
    const artifactStore = createBrowserArtifactStore();

    console.log('[Railgun] Starting engine with database and artifact store...');

    await startRailgunEngine(
      'hackmoney26',  // walletSource (max 16 chars, lowercase)
      db,
      true,           // shouldDebug
      artifactStore,
      false,          // useNativeArtifacts (browser = false, use WASM)
      false,          // skipMerkletreeScans
      ['https://ppoi-agg.horsewithsixlegs.xyz'], // POI nodes for Private Proof of Innocence
      [],             // customPOILists
      false           // verboseScanLogging
    );

    console.log('[Railgun] Engine started successfully!');

    // Set up snarkjs prover AFTER engine starts
    if (!proverSet) {
      try {
        const { getProver } = await import('@railgun-community/wallet');
        const { groth16: groth16Prover } = await import('snarkjs');

        // @ts-ignore - snarkjs type compatibility
        getProver().setSnarkJSGroth16(groth16Prover);
        proverSet = true;
        console.log('[Railgun] Groth16 prover configured');
      } catch (proverError) {
        console.warn('[Railgun] Could not set prover (may use default):', proverError);
        // Continue anyway - Railgun may use default prover
      }
    }

    console.log('[Railgun] Initialization complete!');
  } catch (error) {
    console.error('[Railgun] Engine initialization error:', error);
    throw error;
  }
};

/**
 * Shuts down the Railgun engine and performs cleanup
 * @returns Promise that resolves when shutdown is complete
 */
export const shutdownRailgunEngine = async () => {
  try {
    await stopRailgunEngine();
  } catch (error) {
    console.error('Error shutting down Railgun engine:', error);
  }
};
