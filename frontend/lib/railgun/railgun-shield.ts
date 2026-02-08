import {
  populateShield,
  populateProvedUnshield,
} from '@railgun-community/wallet';
import {
  NetworkName,
  TransactionGasDetails,
  RailgunERC20AmountRecipient,
  RailgunPopulateTransactionResponse,
  TXIDVersion,
} from '@railgun-community/shared-models';
import { getRailgunNetworkName } from './railgun-provider';

/**
 * Shields (deposits) tokens into the Railgun privacy pool
 * @param railgunAddress - The Railgun address to shield tokens to
 * @param tokenAddress - The token address to shield (use zero address for native ETH)
 * @param amount - The amount of tokens to shield (in smallest unit, e.g., wei for ETH)
 * @returns Transaction data for executing the shield
 */
export const shieldTokens = async (
  railgunAddress: string,
  tokenAddress: string,
  amount: bigint
): Promise<RailgunPopulateTransactionResponse> => {
  try {
    console.log(`[Shield] Shielding ${amount} of token ${tokenAddress} to ${railgunAddress}`);

    const networkName = getRailgunNetworkName();
    const txidVersion: TXIDVersion = TXIDVersion.V2_PoseidonMerkle;

    // Create recipient for shielded tokens
    // Note: Railgun SDK expects amount as decimal string
    const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
      {
        tokenAddress,
        amount,
        recipientAddress: railgunAddress,
      },
    ];

    // Get shield private key signature message
    // This would normally require user signing in the UI
    const shieldPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000001'; // Placeholder

    // Populate the shield transaction
    const response = await populateShield(
      txidVersion,
      networkName,
      shieldPrivateKey,
      erc20AmountRecipients,
      [], // nftAmountRecipients
      {} as TransactionGasDetails // Optional gas details
    );

    console.log('[Shield] Shield transaction populated successfully');
    return response;
  } catch (error) {
    console.error('[Shield] Error shielding tokens:', error);
    throw error;
  }
};

/**
 * Unshields (withdraws) tokens from the Railgun privacy pool to a public address
 * @param railgunWalletID - The Railgun wallet ID
 * @param tokenAddress - The token address to unshield (use zero address for native ETH)
 * @param amount - The amount of tokens to unshield (in smallest unit)
 * @param toAddress - The public address to receive the unshielded tokens
 * @returns Transaction data for executing the unshield
 */
export const unshieldTokens = async (
  railgunWalletID: string,
  tokenAddress: string,
  amount: bigint,
  toAddress: string
): Promise<RailgunPopulateTransactionResponse> => {
  try {
    console.log(`[Unshield] Unshielding ${amount} of token ${tokenAddress} to ${toAddress}`);

    const networkName = getRailgunNetworkName();
    const txidVersion: TXIDVersion = TXIDVersion.V2_PoseidonMerkle;

    // Create recipient for unshielded tokens
    const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
      {
        tokenAddress,
        amount,
        recipientAddress: toAddress,
      },
    ];

    // Populate the unshield transaction
    const response = await populateProvedUnshield(
      txidVersion,
      networkName,
      railgunWalletID,
      erc20AmountRecipients,
      [], // nftAmountRecipients
      undefined, // broadcasterFeeERC20AmountRecipient
      false, // sendWithPublicWallet
      undefined, // overallBatchMinGasPrice
      {} as TransactionGasDetails // gasDetails
    );

    console.log('[Unshield] Unshield transaction populated successfully');
    return response;
  } catch (error) {
    console.error('[Unshield] Error unshielding tokens:', error);
    throw error;
  }
};

/**
 * Gets gas estimate for a shield transaction
 * @param railgunAddress - The Railgun address to shield tokens to
 * @param tokenAddress - The token address to shield
 * @param amount - The amount of tokens to shield
 * @param fromWalletAddress - The wallet address sending the transaction
 * @returns Gas estimate response
 */
export const estimateShieldGas = async (
  railgunAddress: string,
  tokenAddress: string,
  amount: bigint,
  fromWalletAddress: string
) => {
  try {
    const networkName = getRailgunNetworkName();
    const txidVersion: TXIDVersion = TXIDVersion.V2_PoseidonMerkle;

    const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
      {
        tokenAddress,
        amount,
        recipientAddress: railgunAddress,
      },
    ];

    // Import gas estimate function
    const { gasEstimateForShield } = await import('@railgun-community/wallet');

    const shieldPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000001';

    const response = await gasEstimateForShield(
      txidVersion,
      networkName,
      shieldPrivateKey,
      erc20AmountRecipients,
      [], // nftAmountRecipients
      fromWalletAddress
    );

    return response;
  } catch (error) {
    console.error('Error estimating shield gas:', error);
    throw error;
  }
};

/**
 * Formats token amount for display
 * @param amount - The amount in smallest unit (wei)
 * @param decimals - The token decimals (default 18 for most ERC20)
 * @returns Formatted amount string
 */
export const formatTokenAmount = (
  amount: bigint,
  decimals: number = 18
): string => {
  // Use BigInt arithmetic to avoid Number/BigInt mixing
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  // Convert to decimal string
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFractionStr = fractionStr.replace(/0+$/, '');

  return `${whole}.${trimmedFractionStr}`;
};
