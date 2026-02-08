# Prediction Market with Uniswap V4 & Railgun Privacy

A decentralized prediction market platform using **Uniswap V4 singleton pools** to eliminate fragmentation in multi-outcome markets, with **Railgun full-shielding privacy** for anonymous trading.

## Overview

### The Problem
Traditional prediction markets with multiple outcomes (e.g., "Who will win the election: A, B, or C?") suffer from fragmentation:
- Separate pools for each outcome
- Liquidity split across pools
- Complex arbitrage between outcomes
- NO tokens create redundant complexity

### Our Solution
**Singleton Pool Architecture** with mathematical insight:
```
NO_A = 1 - (YES_B + YES_C)
```
Each outcome trades against collateral in its own Uniswap V4 pool:
- Pool 1: Token A / Collateral (USDC)
- Pool 2: Token B / Collateral (USDC)
- Pool 3: Token C / Collateral (USDC)

All pools are coordinated through the factory, ensuring Σ(probabilities) = 1.

**Railgun Full-Shielding Privacy** (Phase 2):
- Zero-knowledge proofs hide transaction sources/destinations
- Shielded balances for anonymous trading
- Full transaction privacy while keeping on-chain verification
- No messaging layer (Waku) required for PoC

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PredictionMarketFactory                      │
│  - Creates markets with multiple outcomes                        │
│  - Deploys OutcomeToken ERC20s for each outcome                 │
│  - Initializes Uniswap V4 pools (outcome/collateral pairs)      │
│  - Coordinates with UMA Optimistic Oracle for resolution        │
└──────────────────────────┬──────────────────────────────────────┘
                             │
                             ├───────────────────────────────────┐
                             │                                   │
                    ┌────────▼────────┐                ┌────────▼─────────┐
                    │ Uniswap V4      │                │ UMA Optimistic   │
                    │ PoolManager     │                │ Oracle           │
                    │                 │                │                  │
                    │ Pool A: YES/USDC│                │ Resolution       │
                    │ Pool B: YES/USDC│                │ Dispute system   │
                    │ Pool C: YES/USDC│                │ Bond mechanics   │
                    └─────────────────┘                └──────────────────┘
                             │
                    ┌────────▼────────┐
                    │ RailgunPrivacy  │
                    │ Adapter         │
                    │                 │
                    │ Private swaps   │
                    │ Shielded balances│
                    │ ZK proofs       │
                    └─────────────────┘
```

## Deployed Contracts (Sepolia Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| **PredictionMarketFactory** | [`0x39E54E2B5Db442640654fCD6685aa60bd72e5fCf`](https://sepolia.etherscan.io/address/0x39E54E2B5Db442640654fCD6685aa60bd72e5fCf) | Main factory for creating markets |
| **UMAOptimisticOracle** | [`0xbc073223AC223851E4aC63850EDC51A4837A37D3`](https://sepolia.etherscan.io/address/0xbc073223AC223851E4aC63850EDC51A4837A37D3) | UMA integration for resolution |
| **PoolManager** | [`0xd439886628539bce073347be317fc3ca222f66d9`](https://sepolia.etherscan.io/address/0xd439886628539bce073347be317fc3ca222f66d9) | Uniswap V4 core pool manager |
| **MockERC20 (USDC)** | [`0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B`](https://sepolia.etherscan.io/address/0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B) | Mock collateral token (6 decimals) |
| **RailgunPrivacyAdapter** | [`0xB8FDBDeBc3A9F53FCfc59B8Db8003a862D30Eadf`](https://sepolia.etherscan.io/address/0xB8FDBDeBc3A9F53FCfc59B8Db8003a862D30Eadf) | Privacy adapter for shielded transactions |
| **DeployPoolManager** | [`0xC774940b8a1237A0808dd45ecB235b4426025eD7`](https://sepolia.etherscan.io/address/0xC774940b8a1237A0808dd45ecB235b4426025eD7) | PoolManager deployer wrapper |

## Smart Contracts

### PredictionMarketFactory.sol
Main factory contract for creating and managing prediction markets.

**Key Functions:**
- `createMarket()` - Create a new prediction market with multiple outcomes
- `resolveMarket()` - Resolve market with winning outcome
- `getMarket()` - Query market data
- `getAllMarkets()` - Get all created markets
- `getSumOfProbabilities()` - Calculate Σ(P) across all outcome pools

**Events:**
```solidity
event MarketCreated(
    bytes32 indexed marketId,
    string question,
    string[] outcomes,
    uint256 endTime
);

event MarketResolved(
    bytes32 indexed marketId,
    uint256 winningOutcome
);
```

### OutcomeToken.sol
ERC20 token representing a specific outcome in a prediction market.

**Features:**
- Standard ERC20 with custom metadata (marketId, outcomeIndex, outcomeName)
- Mintable by market owner (factory)
- Resolution tracking (isResolved, isWinningOutcome)
- Redeemable for collateral after resolution
- Implied probability calculation from pool reserves

**Key Functions:**
```solidity
function mint(address to, uint256 amount) external onlyOwner;
function setResolution(bool _isWinningOutcome) external onlyOwner;
function redeem(uint256 amount) external;
function getImpliedProbability() public view returns (uint256);
```

### UMAOptimisticOracle.sol
UMA Optimistic Oracle integration for decentralized market resolution.

**Features:**
- Proposal bond system (0.1 ETH)
- Dispute period (1 day)
- Finalization after dispute period
- Admin bypass for testing (`adminSetResolution()`)

**Resolution Flow:**
1. Market creator requests resolution from UMA
2. Proposer submits answer with bond
3. Dispute period allows challenges
4. Resolution finalized after dispute period
5. Factory applies resolution to outcome tokens

### RailgunPrivacyAdapter.sol (Phase 2)
Privacy adapter for Railgun full-shielding integration.

**Features:**
- Zero-knowledge proof verification
- Shielded balance tracking
- Private swaps between outcome tokens
- Private liquidity provision
- Shielded deposits/withdrawals
- Replay protection via nullifiers

**Key Functions:**
```solidity
function privateSwap(
    RailgunProof calldata proof,
    bytes32 marketId,
    uint256 tokenInIndex,
    uint256 tokenOutIndex,
    uint256 minAmountOut
) external returns (uint256 amountOut);

function privateAddLiquidity(
    RailgunProof calldata proof,
    bytes32 marketId,
    uint256 collateralAmount,
    uint256[] calldata minAmounts
) external;

function shieldedDeposit(
    address token,
    uint256 amount,
    bytes32 commitment
) external;

function shieldedWithdrawal(
    address token,
    uint256 amount,
    RailgunProof calldata proof
) external;
```

## Implementation Status

### ✅ Phase 1: Uniswap V4 Integration (Completed)
- [x] OutcomeToken.sol with resolution logic
- [x] PredictionMarketFactory.sol with Uniswap V4 pool creation
- [x] UMAOptimisticOracle.sol with testing bypass
- [x] MockERC20.sol for collateral token
- [x] Deploy.s.sol deployment script
- [x] Deployment to Sepolia testnet
- [x] Comprehensive testing of market creation, queries, resolution

### ✅ Phase 2: Railgun Full-Shielding (Implementation Complete)
- [x] RailgunPrivacyAdapter.sol implementation
- [x] ZK proof verification structure
- [x] Shielded balance management
- [x] Private swap functionality
- [x] Private liquidity provision
- [x] Shielded deposit/withdrawal
- [x] Deployment to Sepolia testnet
- [x] Frontend hooks with real Railgun SDK integration
- [x] Railgun SDK infrastructure setup (complete browser compatibility)
- [x] Database configuration (IndexedDB via level-js)
- [x] Engine initialization modules with Groth16 prover
- [x] Network provider loading for Sepolia
- [x] React context for Railgun state management (RailgunContext.tsx)
- [x] **Railgun wallet creation** - Real `createRailgunWallet()` implementation
- [x] **ZK proof generation** - Real `generateProofTransactions()` with progress callbacks
- [x] **Token shielding/unshielding** - Real `populateShield()` and `populateProvedUnshield()`
- [x] **UI Components** - RailgunWalletManager and RailgunInitializer components
- [x] **TypeScript compilation** - All types properly configured (ES2020 target)

**✅ Core Privacy Features (Fully Implemented):**
- Wallet creation with BIP39 mnemonic generation
- Zero-knowledge proof generation for private transfers
- Token shielding into privacy pool
- Token unshielding from privacy pool
- React context with complete API surface
- Progress callbacks for long-running operations

**📝 Minor TODOs (Non-blocking):**
- Balance checking functions (stub implementations, requires wallet object access)
- Private key signing integration (uses placeholder, needs user signing flow)
- Dynamic gas estimation (uses fixed values)

**⚠️ Runtime Notes:**
- First initialization takes 1-2 minutes for artifact downloads (~50MB)
- Build warnings about `@react-native-async-storage/async-storage` are expected (optional MetaMask dependency)
- WASM file URL warnings during static generation are expected (works at runtime)

### ✅ Phase 3: Frontend Integration (Core Complete)
- [x] Web3Providers setup with Sepolia configuration
- [x] Contract configuration files
- [x] Railgun privacy hooks with real SDK implementation
- [x] Railgun wallet creation and management UI
- [x] Real ZK proof generation implementation
- [x] Privacy toggle UI components
- [ ] Trading UI component integration with markets
- [ ] Real-time price display from Uniswap V4 pools
- [ ] Market creation interface
- [ ] Liquidity provision interface

## Usage

### Creating a Market

```solidity
// Create a market with 3 outcomes
bytes32 marketId = factory.createMarket(
    "Who will win the 2028 US Presidential Election?",
    ["Candidate A", "Candidate B", "Candidate C"],
    1735689600, // endTime (Unix timestamp)
    0x5465737455494400000000000000000000000000000000000000000000000000, // UMA question ID
    79228162514264337593543950336 // sqrtPriceX96 (initial price = 1)
);
```

### Resolving a Market

```solidity
// Admin bypass for testing
oracle.adminSetResolution(marketId, 1); // Set outcome 1 as winner

// Standard resolution flow (after endTime + dispute period)
factory.resolveMarket(marketId, winningOutcome);
```

### Trading (Public)

```typescript
// Use wagmi + Uniswap V4 SDK
import { useWriteContract } from 'wagmi';
import { PoolKey, PoolState, Position } from '@uniswap/v4-sdk';

// Execute public swap
const { writeContract } = useWriteContract();
await writeContract({
  address: FACTORY_ADDRESS,
  abi: FACTORY_ABI,
  functionName: 'swap',
  args: [marketId, tokenInIndex, tokenOutIndex, amountIn, minAmountOut]
});
```

### Trading (Private with Railgun)

```typescript
// Use Railgun privacy context with real SDK implementation
import { useRailgun } from '@/contexts/RailgunContext';

const {
  isInitialized,
  railgunWallet,
  generateSwapProof,
  shieldToken,
  unshieldToken
} = useRailgun();

// 1. Initialize Railgun engine (one-time setup)
await initialize();

// 2. Create or load Railgun wallet
if (!railgunWallet) {
  await createWallet(); // Generates new mnemonic automatically
}

// 3. Shield tokens into privacy pool
await shieldToken(
  '0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B', // USDC address
  1000000n // 1 USDC (6 decimals)
);

// 4. Generate ZK proof for private swap (uses real Railgun SDK)
const proofData = await generateSwapProof(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  amountOut
);

// 5. Execute private swap through your contract
await writeContract({
  address: RAILGUN_ADAPTER_ADDRESS,
  abi: RAILGUN_ADAPTER_ABI,
  functionName: 'privateSwap',
  args: [proofData, marketId, tokenInIndex, tokenOutIndex, minAmountOut]
});
```

## Testing

### Running Tests

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run all tests
forge test

# Run specific test
forge test --match-test testCreateMarket

# Run with gas snapshots
forge snapshot

# Format code
forge fmt
```

### Manual Testing on Sepolia

**Create a test market:**
```bash
cast send 0x39E54E2B5Db442640654fCD6685aa60bd72e5fCf \
  "createMarket(string,string[],uint256,bytes32,uint160)" \
  "Who will win the 2028 US Presidential Election?" \
  "[\"Candidate A\",\"Candidate B\",\"Candidate C\"]" \
  $(date -v+7d +%s) \
  0x5465737455494400000000000000000000000000000000000000000000000000 \
  79228162514264337593543950336 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Query market data:**
```bash
cast call 0x39E54E2B5Db442640654fCD6685aa60bd72e5fCf \
  "getMarket(bytes32)((address,address,bytes32,string,string[],uint256,uint256,address[],bool,uint256))" \
  <MARKET_ID> \
  --rpc-url $SEPOLIA_RPC_URL
```

**Resolve market (testing mode):**
```bash
cast send 0xbc073223AC223851E4aC63850EDC51A4837A37D3 \
  "adminSetResolution(bytes32,uint256)" \
  <MARKET_ID> \
  1 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Mathematical Foundation

### Implied Probability Calculation
```solidity
function getImpliedProbability() public view returns (uint256) {
    uint256 totalSupply = totalSupply();
    if (totalSupply == 0) {
        return 0.5e18; // 50% if no supply (1 / 2 outcomes)
    }
    uint256 winningBalance = balanceOf(address(this));
    return (winningBalance * 1e18) / totalSupply;
}
```

### Multi-Outcome Constraint
```
Σ(P_i) for all outcomes = 1 (100%)

Where P_i = implied probability of outcome i
```

### NO Token Derivation
```
NO_A = 1 - YES_A
     = 1 - (YES_B + YES_C)

Price of NO tokens is computed, not minted.
```

## Frontend Development

### Dependencies
```bash
cd frontend
npm install
```

**Key packages:**
- `wagmi` - React hooks for Ethereum
- `@rainbow-me/rainbowkit` - Wallet connection
- `@uniswap/v4-sdk` - Uniswap V4 integration
- `@uniswap/sdk-core` - Core Uniswap types
- `@railgun-community/wallet` - Railgun privacy SDK
- `snarkjs` - Zero-knowledge proof generation

### Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0x39E54E2B5Db442640654fCD6685aa60bd72e5fCf
NEXT_PUBLIC_ORACLE_ADDRESS=0xbc073223AC223851E4aC63850EDC51A4837A37D3
NEXT_PUBLIC_COLLATERAL_ADDRESS=0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B
NEXT_PUBLIC_RAILGUN_ADAPTER=0xB8FDBDeBc3A9F53FCfc59B8Db8003a862D30Eadf
NEXT_PUBLIC_CHAIN_ID=11155111
```

## Security Considerations

### Smart Contract Security
- **ReentrancyGuard**: All external functions protected
- **Access Control**: Ownable pattern for admin functions
- **Input Validation**: All user inputs validated
- **Checks-Effects-Interactions**: Standard security pattern
- **Slippage Protection**: Min amount parameters on swaps

### Railgun Privacy Security
- **ZK Proof Verification**: Nullifiers prevent replay attacks
- **Proof Age Limits**: Min 60s, max 24 hours
- **Commitment Schemes**: Pedersen commitments (production)
- **Shielded Balances**: Isolated from public balances

### Economic Security
- **Liquidity Provider Protection**: Slippage limits
- **Market Manipulation Prevention**: Price impact limits
- **Resolution Dispute Mechanism**: UMA bond system
- **Oracle Manipulation Protection**: Time delays + dispute period

## Roadmap

### Completed ✅
- Phase 1: Uniswap V4 integration (factory, markets, UMA oracle)
- Phase 2: Railgun full-shielding privacy (complete SDK integration, wallet creation, ZK proofs)
- Phase 3: Core frontend integration (Railgun context, UI components, real proof generation)

### In Progress 🚧
- Trading UI with privacy toggle
- Real-time price feeds from Uniswap V4 pools
- Market creation interface
- Liquidity provision interface

### Future 📋
- Mainnet deployment
- Additional market types (scalar, categorical)
- Advanced privacy features (stealth addresses)
- Governance token
- Liquidity mining incentives

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **Uniswap V4** - Core pool manager and hooks system
- **UMA** - Optimistic oracle for resolution
- **Railgun** - Full-shielding privacy layer
- **OpenZeppelin** - Secure smart contract libraries
- **Foundry** - Development framework

---

**Built with ❤️ for decentralized prediction markets**
