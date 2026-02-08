import { NetworkName } from '@railgun-community/shared-models';

/**
 * Gets the NetworkName for Sepolia testnet
 * @returns NetworkName.EthereumSepolia
 */
export const getRailgunNetworkName = (): NetworkName => {
  return NetworkName.EthereumSepolia;
};

