import level from 'level-js';

/**
 * Database name for Railgun wallet storage in IndexedDB
 */
const RAILGUN_DB_NAME = 'railgun-wallet-db';

/**
 * Creates a LevelDB database instance using level-js for browser storage
 * This provides IndexedDB-backed storage for Railgun wallets and state
 * @returns LevelDB instance for Railgun SDK
 */
export const createRailgunDatabase = () => {
  return level(RAILGUN_DB_NAME);
};
