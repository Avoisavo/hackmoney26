# Xiphias -- Unified Prediction Markets with Privacy

A decentralized prediction market protocol that solves **liquidity fragmentation**, **whale manipulation**, and **trade privacy** through unified time-based markets, hybrid AMM+CLOB execution, and Railgun zero-knowledge shielding -- all built on **Uniswap V4** and **ENS**.

---

## The Problem

### 1. Liquidity Fragmentation

Logically equivalent questions end up as separate markets, splitting liquidity and weakening pricing.

> *"US strikes Iran **on** Jan 4?"* vs *"US strikes Iran **by** Jan 4?"*

These express related views of the same underlying event, yet they trade as entirely separate markets -- wider spreads, thinner books, worse price discovery.

### 2. Whale Manipulation

A whale can buy a massive position on one side (e.g. YES), forcing:

- YES price up
- NO price down

...even when there is no new information -- just capital pressure. Other participants are forced to trade at the distorted price.

### 3. No Privacy [MODIFY]

When trades are traceable to wallets on-chain:

- **Insiders / informed users avoid trading** -- they don't want to reveal alpha.
- **Signal quality drops** -- markets become FOMO-driven instead of information-driven.
- **Copy-trading & front-running** -- whales get targeted, reducing participation.

---

## The Solution

### 1. One Canonical Time Market -- No Fragmentation

Instead of spawning duplicate markets for the same event, we define **one market** with a single shared liquidity pool over **mutually exclusive atomic outcomes**.

For time-based events, outcomes are defined as:

```
Omega = { Feb 1, Feb 2, ..., Feb 28, Never }
```

with the constraint:

```
SUM over all omega in Omega of p(omega) = 1
```

Then:

| User question | How it maps |
|---|---|
| "on Feb 17" | Atomic outcome `omega = Feb 17`, priced at `p(Feb 17)` |
| "by Feb 17" | Derived bundle: `p(by Feb 17) = SUM(d <= 17) p(Feb d)` |
| "between Feb 10 and Feb 17" | Derived bundle: `SUM(10 <= d <= 17) p(Feb d)` |

"On", "by", and "between" trades are all **bundles of atomic shares** executed against the **same order book / AMM**, so logically equivalent questions never split liquidity.

### 2. Hybrid Execution: AMM + CLOB

Whale manipulation works when a trader can push the visible price with size and force everyone else to trade at the distorted level. Our hybrid execution model breaks this:

**AMM (LMSR) -- manipulation-resistant reference price**

The AMM uses the **Logarithmic Market Scoring Rule (LMSR)**, a cost-function market maker:

```
C(q) = b * ln( SUM_j exp(q_j / b) )
```

where `b` is the liquidity parameter (larger `b` = deeper liquidity, smaller price impact).

Instantaneous prices are the gradient of the cost:

```
p_i = exp(q_i / b) / SUM_j exp(q_j / b)
```

AMM pricing is formula-based. It doesn't instantly jump from an aggressive book trade. To move the AMM price, a whale must trade **through the curve**, paying increasing slippage.

**CLOB -- fast price discovery**

A traditional central limit order book provides the tightest spreads when the book is healthy and allows real information to be priced in quickly.

**Smart Order Routing**

For any incoming order:
1. Compare CLOB vs AMM executable price.
2. Fill from the **cheaper venue first**.
3. If that venue's price worsens as size fills, automatically switch to the other.

The effective market is the **minimum of the two prices** for buys (maximum for sells).

**Convergence logic**
- If a price move is **real and sustained**, repeated trading shifts AMM inventory and the AMM price converges to the new level.
- If the move is **manipulation-only**, the whale must pay increasing slippage to force convergence -- often uneconomic.

**Manipulators pay the protocol** through AMM slippage and trading fees, making manipulation costly rather than free.

### 3. Private Transactions via Railgun + Uniswap V4 [MODIFY]

On Ethereum, trades are transparent. If an insider buys YES with size, anyone can trace the wallet on Etherscan, infer identity, and front-run or copy-trade them.

We integrate **Railgun full-shielding privacy** with Uniswap V4 to let users trade prediction shares without exposing identity or activity:

- **Unlinkability** -- hide who traded
- **Funding provenance hidden** -- no wallet history leaks
- **No wallet-based targeting** -- eliminate copy-trading and intimidation
- **ZK proof verification** -- on-chain verification without revealing trade details
- **Shielded balances** -- tokens held in a privacy pool, invisible to observers

The privacy adapter sits between the user and Uniswap V4 pools, routing trades through Railgun's shielded relay so that on-chain observers see the adapter contract as the trader, not the user's wallet.

---

## Architecture [MODIFY: PUT CANVA DIAGRAM]

```
                          +--------------------------------------------------+
                          |              Frontend (Next.js 16)                |
                          |                                                  |
                          |  Markets UI   ENS Registration   Privacy Toggle  |
                          +----------+-------------------+-------------------+
                                     |                   |
                          +----------v---------+  +------v-----------+
                          |  Wagmi / RainbowKit |  | Railgun SDK      |
                          |  (Public Trades)    |  | (ZK Proofs)      |
                          +----------+---------+  +------+-----------+
                                     |                   |
         +---------------------------+-------------------+---------------------+
         |                           |                                         |
+--------v----------+    +-----------v-----------+    +------------------------+
| PredictionMarket  |    | RailgunPrivacy        |    | ENS Registrar          |
| Factory           |    | Adapter               |    | Controller             |
|                   |    |                       |    |                        |
| - createMarket()  |    | - privateSwap()       |    | - commit()             |
| - resolveMarket() |    | - shieldedDeposit()   |    | - register()           |
| - swap()          |    | - shieldedWithdrawal()|    | - available()          |
+--------+----------+    +-----------+-----------+    +------------------------+
         |                           |
+--------v----------+    +-----------v-----------+
| Uniswap V4        |    | Railgun Proxy         |
| PoolManager       |    | (0xeCFCf...fea)       |
|                   |    |                       |
| Pool A: YES/WETH  |    | ZK Proof Relay        |
| Pool B: YES/WETH  |    | Nullifier Registry    |
| Pool C: YES/WETH  |    | Shielded Pool         |
+-------------------+    +-----------------------+
         |
+--------v----------+
| UMA Optimistic     |
| Oracle             |
|                   |
| Bond: 0.1 ETH     |
| Dispute: 1 day     |
+-------------------+
```

---

## User Flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity 0.8.26, Foundry (Forge / Cast / Anvil) |
| **DEX** | Uniswap V4 Core & Periphery (singleton pools) |
| **Oracle** | UMA Optimistic Oracle (proposal + dispute) |
| **Privacy** | Railgun Protocol, snarkjs, Groth16 proofs |
| **Identity** | ENS (Ethereum Name Service) on Sepolia |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **Web3** | Wagmi 2.x, Viem 2.x, RainbowKit 2.x |
| **Uniswap SDK** | @uniswap/v4-sdk, @uniswap/sdk-core |
| **Railgun SDK** | @railgun-community/wallet, level-js (IndexedDB) |
| **CI/CD** | GitHub Actions |
| **Network** | Sepolia Testnet (Chain ID: 11155111) |

---

## Smart Contracts

### Core Contracts

| Contract | Path | Description |
|---|---|---|
| **PredictionMarketFactory** | `contracts/src/PredictionMarketFactory.sol` | Factory for creating multi-outcome markets. Deploys OutcomeToken ERC20s, initializes Uniswap V4 pools (one per outcome vs collateral), coordinates resolution via UMA. |
| **OutcomeToken** | `contracts/src/OutcomeToken.sol` | ERC20 representing a YES position for a specific outcome. Mintable by factory, tracks resolution state, redeemable for collateral when winning. Computes implied probability from pool reserves. |
| **UMAOptimisticOracle** | `contracts/src/UMAOptimisticOracle.sol` | UMA integration for decentralized market resolution. 0.1 ETH proposal bond, 1-day dispute period, finalization after dispute window. Includes admin bypass for testing. |
| **RailgunPrivacyAdapter** | `contracts/src/RailgunPrivacyAdapter.sol` | Privacy adapter routing trades through Railgun's shielded relay. ZK proof verification, nullifier-based replay protection, anonymized events (no amounts or EOAs logged). |
| **DeployPoolManager** | `contracts/src/DeployPoolManager.sol` | Deployer wrapper for Uniswap V4 PoolManager. |
| **MockERC20** | `contracts/src/mocks/MockERC20.sol` | Mock ERC20 token (USDC stand-in) for testnet usage. |

### ENS Contracts (Sepolia)

| Contract | Address | Description |
|---|---|---|
| **ENS Registry** | [`0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`](https://sepolia.etherscan.io/address/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e) | Core ENS registry -- maps names to owners and resolvers. |
| **ETHRegistrarController** | [`0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968`](https://sepolia.etherscan.io/address/0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968) | Controller for `.eth` name registration (commit-reveal flow). |
| **PublicResolver** | [`0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5`](https://sepolia.etherscan.io/address/0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5) | Resolver for storing ENS records (addresses, text, avatars). |
| **NameWrapper** | [`0x0635513f179D50A207757E05759CbD106d7dFcE8`](https://sepolia.etherscan.io/address/0x0635513f179D50A207757E05759CbD106d7dFcE8) | Wraps ENS names as ERC-1155 tokens with fuse permissions. |

### Uniswap V4 Contracts (Sepolia)

| Contract | Address | Description |
|---|---|---|
| **PoolManager** | [`0xd439886628539bce073347BE317fc3ca222F66d9`](https://sepolia.etherscan.io/address/0xd439886628539bce073347BE317fc3ca222F66d9) | Uniswap V4 singleton PoolManager -- manages all outcome/collateral pools in a single contract. |

### Deployed Contracts (Sepolia)

| Contract | Address | Description |
|---|---|---|
| **PredictionMarketFactory** | [`0x2b6c84247a0e777af6326f3486ad798f776a47fd`](https://sepolia.etherscan.io/address/0x2b6c84247a0e777af6326f3486ad798f776a47fd) | Main factory for creating and managing markets. |
| **UMAOptimisticOracle** | [`0x7608B6DEA4781bCFDD036834FF85c0A034477920`](https://sepolia.etherscan.io/address/0x7608B6DEA4781bCFDD036834FF85c0A034477920) | Oracle for decentralized market resolution. |
| **RailgunPrivacyAdapter** | [`0x2Bb3308Ea6F79093D6f730bFA4e7D78a1D53B425`](https://sepolia.etherscan.io/address/0x2Bb3308Ea6F79093D6f730bFA4e7D78a1D53B425) | Privacy adapter for shielded trading. |
| **Railgun Proxy** | [`0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea`](https://sepolia.etherscan.io/address/0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea) | Official Railgun relay proxy. |
| **Collateral (WETH)** | [`0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9`](https://sepolia.etherscan.io/address/0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9) | Wrapped Ether used as market collateral. |
| **Relayer** | [`0x07dab64Aa125B206D7fd6a81AaB2133A0bdEF863`](https://sepolia.etherscan.io/address/0x07dab64Aa125B206D7fd6a81AaB2133A0bdEF863) | Transaction relayer for gas abstraction. |

---

## Implementation Details

### Market Creation Flow

```solidity
// Create a 3-outcome market with Uniswap V4 pools
bytes32 marketId = factory.createMarket(
    "Who will win the 2028 US Presidential Election?",
    ["Candidate A", "Candidate B", "Candidate C"],
    1735689600, // endTime (Unix timestamp)
    umaQuestionId,
    sqrtPriceX96 // initial price
);
```

Under the hood:
1. Factory deploys an `OutcomeToken` ERC20 for each outcome.
2. Factory initializes a Uniswap V4 pool for each outcome token paired against collateral (WETH).
3. All pools are coordinated so `SUM(probabilities) = 1`.
4. UMA question ID is registered for decentralized resolution.

### Resolution Flow

```
Market ends --> Proposer submits outcome (0.1 ETH bond)
            --> 1-day dispute window
            --> If no dispute: finalize resolution
            --> Factory marks winning OutcomeToken
            --> Winners redeem tokens for collateral
```

### Private Trading Flow

```
User --> Railgun SDK (browser)
     --> Generate ZK proof (Groth16)
     --> Submit to RailgunPrivacyAdapter
     --> Adapter verifies proof + nullifier
     --> Executes swap via Factory / Uniswap V4
     --> Emits anonymized event (no amounts, no EOA)
```

Key privacy guarantees:
- **Nullifier-based replay protection** -- each proof can only be used once.
- **Proof age limits** -- minimum 60 seconds, maximum 24 hours.
- **Anonymized events** -- on-chain logs contain only the nullifier and token addresses, not amounts or user wallets.

### ENS Integration

Users can register `.eth` names directly from the platform using ENS's commit-reveal registration flow on Sepolia:

1. **Check availability** -- query `ETHRegistrarController.available(name)`
2. **Commit** -- submit a commitment hash (name + owner + secret)
3. **Wait** -- 60-second minimum delay to prevent front-running
4. **Register** -- complete registration with payment
5. **Set records** -- configure resolver, avatar, and other text records

---

## Project Structure

```
hackmoney26/
|
+-- contracts/                      # Solidity smart contracts (Foundry)
|   +-- src/
|   |   +-- PredictionMarketFactory.sol
|   |   +-- OutcomeToken.sol
|   |   +-- UMAOptimisticOracle.sol
|   |   +-- RailgunPrivacyAdapter.sol
|   |   +-- DeployPoolManager.sol
|   |   +-- interfaces/IERC20.sol
|   |   +-- mocks/MockERC20.sol
|   +-- script/                     # Deployment scripts
|   |   +-- Deploy.s.sol
|   |   +-- CreateTestMarket.s.sol
|   |   +-- AddLiquidity.s.sol
|   |   +-- DeployRailgunAdapter.s.sol
|   +-- lib/                        # Dependencies (git submodules)
|       +-- forge-std/
|       +-- openzeppelin-contracts/
|       +-- v4-core/
|       +-- v4-periphery/
|
+-- script/                         # Root-level Foundry scripts
|   +-- DeployAll.s.sol
|   +-- PrivacyTest.s.sol
|   +-- ComparePrivacy.s.sol
|   +-- ExecuteSwap.s.sol
|   +-- MintTokens.s.sol
|   +-- MintOutcomeTokens.s.sol
|
+-- frontend/                       # Next.js 16 application
|   +-- app/
|   |   +-- page.tsx                # Redirects to /markets
|   |   +-- layout.tsx              # Root layout
|   |   +-- markets/                # Market listing & detail pages
|   |   +-- ens/                    # ENS name registration page
|   |   +-- api/
|   |       +-- railgun/            # Railgun SDK API routes
|   |       +-- relayer/            # Relayer submission endpoint
|   |       +-- polymarket/         # Polymarket data feed
|   +-- components/
|   |   +-- events/                 # Market cards (Election, Iran, Crypto, etc.)
|   |   +-- layout/                 # GlobalHeader, Sidebar
|   |   +-- railgun/               # RailgunInitializer, WalletManager
|   |   +-- shared/                # Shared UI components
|   +-- contexts/
|   |   +-- RailgunContext.tsx      # Railgun SDK state provider
|   +-- hooks/                      # Custom React hooks
|   |   +-- useRailgunPrivacy.ts
|   |   +-- useRailgunWallet.tsx
|   |   +-- useTrading.ts
|   |   +-- useShielding.ts
|   |   +-- usePrivateMarketTrading.ts
|   +-- lib/
|   |   +-- constants.ts            # Contract addresses
|   |   +-- networkConfig.ts        # Chain & ENS config
|   |   +-- wagmi.ts                # Wagmi client setup
|   |   +-- abis/                   # Contract ABIs
|   |   +-- ens/                    # ENS hooks (availability, commit, register)
|   |   +-- railgun/               # Railgun SDK modules
|   |       +-- engine.ts
|   |       +-- railgun-wallet.ts
|   |       +-- railgun-shield.ts
|   |       +-- railgun-transactions.ts
|   |       +-- relayer.ts
|   |       +-- trade.ts
|   +-- artifacts/                  # ZK proof artifacts (vkey, wasm, zkey)
|   +-- public/
|       +-- wasm/                   # WASM binaries (Poseidon hash, curve ops)
|       +-- electiongrid/           # Market card images
|       +-- market/                 # Event images
|       +-- logo/                   # Xiphias logo
|
+-- .github/workflows/test.yml     # CI: build + test on push/PR
+-- foundry.toml                    # Foundry configuration
+-- .env.example                    # Environment template
```

---

## Security

### Smart Contract Security
- **ReentrancyGuard** on all state-changing external functions
- **Ownable** access control for admin operations
- **Input validation** on all user-supplied parameters
- **Checks-Effects-Interactions** pattern throughout
- **Slippage protection** via minimum amount parameters

### Privacy Security
- **Nullifier registry** prevents ZK proof replay
- **Proof age bounds** (60s min, 24h max) prevent stale proof attacks
- **Anonymized events** -- no amounts or user EOAs in logs
- **Shielded balances** isolated from public token balances

### Economic Security
- **AMM slippage curve** makes whale manipulation expensive
- **Dual-venue routing** prevents single-venue price distortion
- **UMA dispute mechanism** with bond forfeiture deters false resolutions
- **Time-locked resolution** with configurable dispute periods

---

## Deployed Contracts & Transaction Hashes

| Protocol | Transaction Hash |
|---|---|
| **ENS** | [`0xae8d130c84906ab9cd4f011ecf639814b852a098f4913ac2aff3ef6581c73d62`](https://sepolia.etherscan.io/tx/0xae8d130c84906ab9cd4f011ecf639814b852a098f4913ac2aff3ef6581c73d62) |

---

## Team

| Name | Role |
|---|---|
| **Tan Zhi Wei** | |
| **Ho Shao Mun** | |
| **Edwina Hon** | |

---

## Acknowledgments

- [Uniswap V4](https://github.com/Uniswap/v4-core) -- Singleton pool architecture
- [UMA Protocol](https://uma.xyz/) -- Optimistic oracle for resolution
- [Railgun](https://railgun.org/) -- Full-shielding privacy layer
- [ENS](https://ens.domains/) -- Ethereum Name Service
- [OpenZeppelin](https://openzeppelin.com/) -- Secure contract libraries
- [Foundry](https://book.getfoundry.sh/) -- Solidity development framework

---

**Built for HackMoney 2026**
