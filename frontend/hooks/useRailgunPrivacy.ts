import { useReadContract, useWriteContract } from 'wagmi';
import { ADDRESS_ZERO, RAILGUN_ADAPTER_ADDRESS } from '@/lib/constants';
import { useRailgun } from '@/contexts/RailgunContext';
import {
  generatePrivateSwapProof as generateRailgunProof,
  hasSufficientShieldedBalance,
} from '@/lib/railgun/railgun-transactions';

/**
 * @notice Types for Railgun privacy operations
 */

export interface RailgunProof {
  nullifier: `0x${string}`;
  commitment: `0x${string}`;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  timestamp: number;
  merkleRoot: `0x${string}`;
  balanceProofs: [`0x${string}`, `0x${string}`];
  signature: `0x${string}`;
}

export interface PrivateSwapParams {
  marketId: `0x${string}`;
  tokenInIndex: number;
  tokenOutIndex: number;
  amountIn: string;
  minAmountOut: string;
}

export interface PrivateLiquidityParams {
  marketId: `0x${string}`;
  collateralAmount: string;
  minAmounts: string[];
}

// Contract address imported from constants
// const RAILGUN_ADAPTER_ADDRESS is imported from '@/lib/constants'

const RAILGUN_ADAPTER_ABI = [
  // Read-only functions
  {
    "inputs": [
      { "name": "factory", "type": "address" },
      { "name": "collateralToken", "type": "address" },
      { "name": "railgunShieldedPoolRouter", "type": "address" }
    ],
    "name": "factory",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "commitment", "type": "bytes32" },
      { "name": "token", "type": "address" }
    ],
    "name": "getShieldedBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRailgunRouter",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [
      { "name": "encryptedProof", "type": "bytes" },
      { "name": "marketId", "type": "bytes32" },
      { "name": "tokenInIndex", "type": "uint256" },
      { "name": "tokenOutIndex", "type": "uint256" },
      { "name": "minAmountOut", "type": "uint256" }
    ],
    "name": "privateSwap",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "encryptedProof", "type": "bytes" }
    ],
    "name": "unshieldETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * @notice Hook for private swap operations
 * @dev Uses Railgun privacy to hide transaction sources/destinations
 */
export function usePrivateSwap() {
  const { writeContract, isPending } = useWriteContract();
  const { isInitialized } = useRailgun();

  const executePrivateSwap = async (
    proof: RailgunProof,
    params: PrivateSwapParams
  ) => {
    // Check if Railgun is initialized
    if (!isInitialized) {
      throw new Error('Railgun not initialized. Please wait for initialization to complete.');
    }

    // Validate inputs
    if (!proof?.nullifier || !params?.marketId) {
      throw new Error('Invalid proof or params');
    }

    // Execute private swap through Railgun adapter
    return writeContract({
      address: RAILGUN_ADAPTER_ADDRESS,
      abi: RAILGUN_ADAPTER_ABI,
      functionName: 'privateSwap',
      args: [proof, params.marketId, params.tokenInIndex, params.tokenOutIndex, params.amountIn, params.minAmountOut],
    });
  };

  return { executePrivateSwap, isPending };
}

/**
 * @notice Hook for private liquidity provision
 * @dev Allows users to provide liquidity without revealing identity
 */
export function usePrivateLiquidity() {
  const { writeContract, isPending } = useWriteContract();
  const { isInitialized } = useRailgun();

  const executePrivateLiquidity = async (
    proof: RailgunProof,
    params: PrivateLiquidityParams
  ) => {
    // Check if Railgun is initialized
    if (!isInitialized) {
      throw new Error('Railgun not initialized. Please wait for initialization to complete.');
    }

    // Validate inputs
    if (!proof?.nullifier || !params?.marketId) {
      throw new Error('Invalid proof or params');
    }

    // Execute private liquidity addition
    return writeContract({
      address: RAILGUN_ADAPTER_ADDRESS,
      abi: RAILGUN_ADAPTER_ABI,
      functionName: 'privateAddLiquidity',
      args: [proof, params.marketId, params.collateralAmount, params.minAmounts],
    });
  };

  return { executePrivateLiquidity, isPending };
}

/**
 * @notice Hook to check shielded balance
 * @dev Returns the shielded balance for a given commitment and token
 */
export function useShieldedBalance(commitment: `0x${string}`, token: `0x${string}`) {
  return useReadContract({
    address: RAILGUN_ADAPTER_ADDRESS,
    abi: RAILGUN_ADAPTER_ABI,
    functionName: 'getShieldedBalance',
    args: [commitment, token],
    // In wagmi v2, queries auto-disable when args are undefined/null
    query: {
      enabled: !!commitment && !!token && commitment !== ADDRESS_ZERO && token !== ADDRESS_ZERO,
    },
  });
}

/**
 * @notice Hook to get Railgun adapter info
 */
export function useRailgunAdapter() {
  const { data: factory } = useReadContract({
    address: RAILGUN_ADAPTER_ADDRESS,
    abi: RAILGUN_ADAPTER_ABI,
    functionName: 'factory',
  });

  const { data: collateralToken } = useReadContract({
    address: RAILGUN_ADAPTER_ADDRESS,
    abi: RAILGUN_ADAPTER_ABI,
    functionName: 'collateralToken',
  });

  const { data: railgunRouter } = useReadContract({
    address: RAILGUN_ADAPTER_ADDRESS,
    abi: RAILGUN_ADAPTER_ABI,
    functionName: 'getRailgunRouter',
  });

  return {
    factory: factory as `0x${string}` | undefined,
    collateralToken: collateralToken as `0x${string}` | undefined,
    railgunRouter: railgunRouter as `0x${string}` | undefined,
  };
}

/**
 * @notice Generate a mock Railgun proof for testing
 * @dev In production, this would use actual Railgun SDK to generate ZK proofs
 */
export function generateMockProof(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: string | bigint,
  amountOut: string | bigint,
  baseCommitment?: `0x${string}`
): RailgunProof {
  // Use a timestamp slightly in the past (2 minutes ago) to satisfy MIN_PROOF_AGE (60s)
  // while staying well within MAX_PROOF_AGE (24h) to avoid ProofExpired errors
  const timestamp = Math.floor(Date.now() / 1000) - 120;


  // Generate random bytes32 values (exactly 64 hex chars = 32 bytes)
  const randomBytes32 = () => {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result as `0x${string}`;
  };

  const nullifier = randomBytes32();
  const commitment = baseCommitment || randomBytes32();

  return {
    nullifier,
    commitment,
    tokenIn,
    tokenOut,
    amountIn: BigInt(amountIn),
    amountOut: BigInt(amountOut),
    timestamp,
    merkleRoot: '0x' + '0'.repeat(64) as `0x${string}`, // bytes32 placeholder
    balanceProofs: [randomBytes32(), randomBytes32()] as [`0x${string}`, `0x${string}`],
    signature: '0x' + '0'.repeat(128) as `0x${string}`, // bytes placeholder (64 bytes)
  };
}

/**
 * @notice Generate a real Railgun ZK proof for private operations
 * @dev This uses the actual Railgun SDK to generate ZK proofs
 * @note The Railgun SDK has its own transaction format that differs from our custom RailgunPrivacyAdapter
 *      For production use with official Railgun contracts, use the transaction data returned directly
 * @param railgunWalletID - The Railgun wallet ID
 * @param tokenIn - The input token address
 * @param tokenOut - The output token address
 * @param amountIn - The amount of input tokens
 * @param amountOut - The expected amount of output tokens
 * @param receiverAddress - The Railgun address to receive output tokens
 * @returns RailgunPopulateTransactionResponse from the SDK
 */
export async function generateRealProof(
  railgunWalletID: string,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: string | bigint,
  amountOut: string | bigint,
  receiverAddress: `0x${string}`
) {
  // Check if sufficient shielded balance exists
  const hasBalance = await hasSufficientShieldedBalance(
    railgunWalletID,
    tokenIn,
    BigInt(amountIn)
  );

  if (!hasBalance) {
    throw new Error('Insufficient shielded balance. Please shield tokens first.');
  }

  // Generate the ZK proof using Railgun SDK
  const proofData = await generateRailgunProof(
    railgunWalletID,
    tokenIn,
    tokenOut,
    BigInt(amountIn),
    BigInt(amountOut),
    receiverAddress
  );

  return proofData;
}

/**
 * @notice Check if a Railgun wallet has sufficient shielded balance
 * @dev Helper function to check balance before transactions
 * @param railgunWalletID - The Railgun wallet ID
 * @param tokenAddress - The token address to check
 * @param requiredAmount - The required amount
 * @returns true if sufficient balance exists
 */
export async function checkShieldedBalance(
  railgunWalletID: string,
  tokenAddress: `0x${string}`,
  requiredAmount: string | bigint
): Promise<boolean> {
  return hasSufficientShieldedBalance(
    railgunWalletID,
    tokenAddress,
    BigInt(requiredAmount)
  );
}

/**
 * @notice Hook for private withdrawal from shielded pool
 * @dev Allows users to withdraw tokens privately
 */
export function usePrivateWithdrawal() {
  const { writeContract, isPending } = useWriteContract();
  const { isInitialized } = useRailgun();

  const executeWithdrawal = async (
    proof: RailgunProof,
    token: `0x${string}`,
    amount: string | bigint
  ) => {
    // Check if Railgun is initialized
    if (!isInitialized) {
      throw new Error('Railgun not initialized. Please wait for initialization to complete.');
    }

    // Validate inputs
    if (!proof?.nullifier || !token) {
      throw new Error('Invalid proof or token');
    }

    // Execute private withdrawal
    return writeContract({
      address: RAILGUN_ADAPTER_ADDRESS,
      abi: RAILGUN_ADAPTER_ABI,
      functionName: 'shieldedWithdrawal',
      args: [token, amount, proof],
    });
  };

  return { executeWithdrawal, isPending };
}
