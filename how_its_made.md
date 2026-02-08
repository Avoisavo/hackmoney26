# How it's Made -- Xiphias Technical Deep Dive

Xiphias is a unified prediction market protocol designed to solve liquidity fragmentation, whale manipulation, and trade privacy. Here is the technical breakdown of how we built it.

## 1. Unified Liquidity via Uniswap V4
Instead of creating separate markets for slightly different questions (e.g., "by Jan 4" vs "on Jan 4"), we use **Uniswap V4's Singleton architecture** to manage atomic time-based outcomes.
- We deploy **OutcomeToken (ERC20)** for each mutually exclusive event outcome.
- Using Uniswap V4, we initialize pools where each outcome token is paired against a base collateral (WETH/USDC).
- This allows "bundle trades" (like "by Feb 17") to be executed as a single transaction across multiple atomic pools, ensuring that all related questions draw from the same liquidity source.

## 2. Zero-Knowledge Privacy with Railgun
To protect market signals and prevent copy-trading, we integrated **Railgun's full-shielding privacy layer**.
- **ZK-Proof Integration**: Users generate **Groth16 proofs** using the Railgun SDK in the browser.
- **Privacy Adapter**: We built a custom `RailgunPrivacyAdapter.sol` that sits between the user and the Uniswap V4 pools.
- **Shielded Trading**: The adapter verifies the ZK proof and executes the trade via the official Railgun relay. This ensures that on-chain observers see the adapter as the trader, while the user's identity and funding provenance remain completely hidden.

## 3. Decentralized Resolution via UMA
We use **UMA's Optimistic Oracle** to ensure fair and decentralized market resolution.
- When a market ends, a proposer submits the outcome with a 0.1 ETH bond.
- A **24-hour dispute window** allows anyone to challenge the result if it's incorrect.
- If no dispute occurs, the `PredictionMarketFactory` marks the winning outcome, allowing users to redeem their tokens for the underlying collateral.

## 4. Identity & UX with ENS
We integrated **ENS (Ethereum Name Service)** directly into the onboarding flow on Sepolia.
- Users can check name availability and register `.eth` subdomains (e.g., `user.xiphias.eth`) without leaving the app.
- We utilize the **commit-reveal registration flow** and the `PublicResolver` to store avatars and metadata, making the prediction market feel like a social, identity-first platform.

## 5. The Hybrid Execution Engine
To combat price manipulation, we implemented a hybrid model combining a **Logarithmic Market Scoring Rule (LMSR) AMM** with a **Central Limit Order Book (CLOB)**.
- **Smart Order Routing**: The system compares the executable price on the CLOB vs. the AMM and fills from the cheaper venue first.
- **Convergence Logic**: Because the AMM is formula-driven ($C(q) = b \cdot \ln(\sum e^{q_j/b})$), it doesn't instantly jump based on "vibe" or single large trades. This forces manipulators to "pay the protocol" in slippage if they want to move the market without real information.

## 6. Tech Stack Summary
- **Contracts**: Solidity 0.8.26, Foundry
- **DEX**: Uniswap V4 Core & Periphery
- **Privacy**: Railgun Protocol, snarkjs
- **Oracle**: UMA Optimistic Oracle
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion
- **Web3**: Wagmi 2.x, Viem 2.x, RainbowKit 2.x
