/**
 * Common constants used throughout the application
 */

/**
 * The zero address (0x0000000000000000000000000000000000000000)
 * Used to represent an uninitialized or invalid address
 */
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;

/**
 * Deployed contract addresses on Sepolia
 */
// Deployed Contracts (Sepolia)
export const FACTORY_ADDRESS = '0x2b6c84247a0e777af6326f3486ad798f776a47fd' as const;
export const ORACLE_ADDRESS = '0x7608B6DEA4781bCFDD036834FF85c0A034477920' as const;
export const RAILGUN_ADAPTER_ADDRESS = '0x2Bb3308Ea6F79093D6f730bFA4e7D78a1D53B425' as const;
export const RAILGUN_PROXY_ADDRESS = '0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea' as const;
export const COLLATERAL_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' as const;
export const POOLMANAGER_ADDRESS = '0xd439886628539bce073347BE317fc3ca222F66d9' as const;
export const RELAYER_ADDRESS = '0x07dab64Aa125B206D7fd6a81AaB2133A0bdEF863' as const;

/**
 * Sepolia testnet token addresses for testing
 */
// USDC on Sepolia (Circle's official testnet USDC)
export const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;
// WETH on Sepolia (Wrapped Ether)
export const SEPOLIA_WETH = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' as const;
