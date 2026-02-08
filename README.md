![WhatsApp Image 2026-02-08 at 10 34 19 PM](https://github.com/user-attachments/assets/6f8076c1-76f5-4369-a0a6-78b40ccd4513)

# Xiphias -- Unified Prediction Markets with Privacy

A decentralized prediction market protocol that solves **liquidity fragmentation**, **whale manipulation**, and **trade privacy** through unified time-based markets, hybrid AMM+CLOB execution, and Railgun zero-knowledge shielding -- all built on **Yellow** , **Uniswap V4** , **ENS** and **Railgun**.

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

### 3. No Privacy

When trades are traceable to wallets on-chain:

- **Insiders / informed users avoid trading** -- they don't want to reveal alpha.
- **Signal quality drops** -- markets become FOMO-driven instead of information-driven.
- **Copy-trading & front-running** -- whales get targeted, reducing participation.

---

## The Solution

### 1. One Canonical Time Market -- No Fragmentation

Instead of spawning duplicate markets for the same event, we define **one market** with a single shared liquidity pool over **mutually exclusive atomic outcomes**.

For time-based events, outcomes are defined as:

$$\Omega = \{\text{Feb 1},\; \text{Feb 2},\; \dots,\; \text{Feb 28},\; \text{Never}\}$$

with the constraint:

$$\sum_{\omega \in \Omega} p(\omega) = 1$$

Then:

| User question | How it maps |
|---|---|
| "on Feb 17" | Atomic outcome `omega = Feb 17`, priced at `p(Feb 17)` |
| "by Feb 17" | Derived bundle: `p(by Feb 17) = SUM(d <= 17) p(Feb d)` |
| "between Feb 10 and Feb 17" | Derived bundle: `SUM(10 <= d <= 17) p(Feb d)` |

"On", "by", and "between" trades are all **bundles of atomic shares** executed against the **same order book / AMM**, so logically equivalent questions never split liquidity.


### 2. Hybrid Execution: AMM + CLOB

Whale manipulation works when a trader can push the visible price with size and make everyone else trade at that distorted level. Our hybrid execution model reduces this by combining formula-based liquidity (AMM) with order-book price discovery (CLOB), then routing trades to the best price.

#### a) AMM (LMSR)

The AMM uses the Logarithmic Market Scoring Rule (LMSR), a cost-function market maker:

$$C(q) = b \cdot \ln\!\left(\sum_{j} e^{\,q_j / b}\right)$$

where 𝑏 is the liquidity parameter (larger 𝑏 = deeper liquidity, smaller price impact).

Instantaneous prices come from the gradient of the cost:

$$p_i = \frac{e^{\,q_i / b}}{\sum_{j} e^{\,q_j / b}}$$

Interpretation: AMM pricing is rule-based, not "whatever the last trade was."
So it doesn't instantly jump just because someone slams the book. To move the AMM price, a whale must buy through the curve, paying increasing slippage.

#### b) CLOB

A central limit order book (CLOB) provides:

- the tightest spreads when liquidity is healthy
- fast reaction to real information (news gets priced in quickly)

#### c) Smart order routing

For every incoming order, the backend provides best execution:

- Compare the executable price on CLOB vs AMM
- Fill from the cheaper venue first
- As size fills and the chosen venue becomes worse, automatically switch to the other venue

So the effective market is:

- min(CLOB, AMM) for buys
- max(CLOB, AMM) for sells

#### d) Convergence logic

If the move is real and sustained, repeated trading shifts AMM inventory, and the AMM price converges toward the new level.

If the move is manipulation-only, the whale must keep trading through the AMM curve to force convergence, paying more and more slippage — often uneconomic.

#### e) Manipulators pay the protocol

Because forcing the market requires trading through the AMM, manipulators end up paying:

- AMM slippage (price impact)
- trading fees

So manipulation becomes costly, not free.

#### f) Worked example: three scenarios

**Scenario A -- Normal user, normal market**

Both venues quote similar prices:

| Venue | YES | NO |
|---|---|---|
| CLOB | 51¢ | 49¢ |
| AMM | 52¢ | 50¢ |

A user wants to buy YES. The router compares both venues and fills from the CLOB first at 51¢ (cheaper). As CLOB fills lift the price to 52¢, the two venues are equal -- the router continues filling from whichever is cheaper. If the CLOB price rises further to 53¢ while the AMM still quotes 52¢, the router automatically switches to the AMM. The user always gets the best available price across both venues.

**Scenario B -- Real news event (e.g. "Trump announces strike on Iran on the 19th")**

The CLOB reacts instantly to the news; the AMM lags because it is formula-driven:

| Venue | YES | NO |
|---|---|---|
| CLOB | 90¢ | 9¢ |
| AMM | 52¢ | 50¢ |

New buy orders are routed to the AMM first at 52¢ because it is far cheaper. As volume flows through the AMM, the curve moves and the AMM price converges upward toward the CLOB. You might wonder: platforms like Kalshi or Polymarket would sell at 90¢ -- are we losing profit by selling at 52¢? No. Every trade through the AMM curve earns the protocol fees and slippage revenue. The protocol profits from the price dislocation rather than letting it go to a single venue.

**Scenario C -- Whale manipulation ($1M one-sided buy)**

A whale buys $1,000,000 of YES on the CLOB, pushing the price up:

| Venue | YES | NO |
|---|---|---|
| CLOB | 90¢ | 9¢ |
| AMM | 52¢ | 50¢ |

The CLOB has jumped because it reflects order-book pressure. The AMM has no market-context awareness -- it only moves when someone actually trades through its curve. So new users buying YES get routed to the AMM at 52¢ first. The whale cannot force everyone to pay 90¢ unless they also push the AMM price up to 90¢, which means buying through the entire curve from 52¢ to 90¢. That costs massive slippage, and all of that slippage is captured by the protocol and LPs. The whale pays for their own manipulation.

### 3. Private Transactions via Railgun + Uniswap V4

<img width="5376" height="1660" alt="image" src="https://github.com/user-attachments/assets/a912018c-a5ce-449f-a1c4-4e47e62c20ee" />


On Ethereum, trades are transparent. If an insider buys YES with size, anyone can trace the wallet on Etherscan, infer identity, and front-run or copy-trade them.

We integrate **Railgun full-shielding privacy** with Uniswap V4 to let users trade prediction shares without exposing identity or activity:

- **Unlinkability** -- hide who traded
- **Funding provenance hidden** -- no wallet history leaks
- **No wallet-based targeting** -- eliminate copy-trading and intimidation
- **ZK proof verification** -- on-chain verification without revealing trade details
- **Shielded balances** -- tokens held in a privacy pool, invisible to observers

The privacy adapter sits between the user and Uniswap V4 pools, routing trades through Railgun's shielded relay so that on-chain observers see the adapter contract as the trader, not the user's wallet.

---

## Architecture

<img width="1920" height="1080" alt="Blue and White Gradient Modern Project Presentation" src="https://github.com/user-attachments/assets/a5cbe7fe-42b4-4c7c-a2ae-44e635f5b9fd" />


---

## User Flow

<img width="1920" height="1080" alt="Blue and White Gradient Modern Project Presentation (1)" src="https://github.com/user-attachments/assets/af405147-2136-4dd3-a8d3-9b3e8d562c75" />

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

| Name |
|---|
| **Tan Zhi Wei** |
| **Ho Shao Mun** |
| **Edwina Hon** |

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
