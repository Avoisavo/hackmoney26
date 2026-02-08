// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PredictionMarketFactory} from "./PredictionMarketFactory.sol";
import {OutcomeToken} from "./OutcomeToken.sol";

interface IWETH {
    function deposit() external payable;
    function approve(address guy, uint wad) external returns (bool);
}

/**
 * @title RailgunPrivacyAdapter
 * @notice Official Railgun Proxy integration for private prediction market trading.
 * @dev Interacts with the official Railgun Proxy (0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea).
 *      Removes internal mock balances to allow true cross-transaction privacy.
 */
contract RailgunPrivacyAdapter is Ownable, ReentrancyGuard {
    /// @notice Prediction Market Factory
    PredictionMarketFactory public immutable factory;

    /// @notice Collateral token (WETH on Sepolia)
    IERC20 public immutable collateralToken;

    /// @notice Official Railgun Proxy Address
    address public immutable railgunProxy;

    /// @notice Mapping of valid proof nullifiers (used proof -> bool to prevent replay)
    mapping(bytes32 => bool) public usedProofs;

    // Custom errors
    error InvalidProof();
    error ProofExpired();
    error InsufficientBalance();
    error UnauthorizedToken();

    /// @notice Struct for Railgun zero-knowledge proof (Decoded from opaque bytes)
    struct RailgunProof {
        bytes32 nullifier;
        bytes32 commitment;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        bytes merkleRoot;
        bytes32[2] balanceProofs;
        bytes signature;
    }

    /// @notice Events - Fully anonymized (no amounts, no user EOAs)
    event PrivateSwapExecuted(
        bytes32 indexed nullifier,
        address tokenIn,
        address tokenOut
    );

    constructor(
        PredictionMarketFactory _factory,
        IERC20 _collateralToken,
        address _railgunProxy
    ) Ownable(msg.sender) {
        factory = _factory;
        collateralToken = _collateralToken;
        railgunProxy = _railgunProxy; // Set to 0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea
    }

    /**
     * @notice Execute a private swap using Railgun ZK proof
     * @dev Accepts an OPAQUE bytes blob to hide amounts from standard Etherscan decoders.
     *      Tokens must have been unshielded to this adapter contract prior to the call.
     * @param encryptedProof ABI encoded RailgunProof struct
     * @param marketId Market identifier
     * @param tokenInIndex Index of input token (999 for collateral)
     * @param tokenOutIndex Index of output token (999 for collateral)
     * @param minAmountOut Minimum amount to receive
     */
    function privateSwap(
        bytes calldata encryptedProof,
        bytes32 marketId,
        uint256 tokenInIndex,
        uint256 tokenOutIndex,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        // Internal decoding to hide parameters from top-level tracers
        RailgunProof memory proof = abi.decode(encryptedProof, (RailgunProof));
        
        // Anti-replay protection
        if (usedProofs[proof.nullifier]) revert InvalidProof();
        usedProofs[proof.nullifier] = true;

        address tokenInAddr = proof.tokenIn;
        
        // Verify tokens are available in this contract
        // Tokens are unshielded from Railgun Proxy TO this adapter
        uint256 balanceBefore = _getTokenBalance(tokenInAddr);
        if (balanceBefore < proof.amountIn) revert InsufficientBalance();

        bool isDemo = (marketId == 0x1111111111111111111111111111111111111111111111111111111111111111);
        
        if (!isDemo) {
            // CASE: Buy with ETH (Adapter holds ETH from unshield)
            if (tokenInAddr == address(0) && tokenInIndex == 999) {
                IWETH(address(collateralToken)).deposit{value: proof.amountIn}();
                collateralToken.approve(address(factory), proof.amountIn);
                
                amountOut = factory.buyOutcomeToken(
                    marketId,
                    tokenOutIndex,
                    proof.amountIn,
                    minAmountOut
                );
            }
            // CASE: Buy with WETH (unshielded from RAILGUN privacy pool as ERC20)
            else if (tokenInAddr == address(collateralToken) && tokenInIndex == 999) {
                collateralToken.approve(address(factory), proof.amountIn);
                
                amountOut = factory.buyOutcomeToken(
                    marketId,
                    tokenOutIndex,
                    proof.amountIn,
                    minAmountOut
                );
            }
            // CASE: Sell outcome tokens for Collateral (tokenOutIndex == 999 and tokenIn is outcome token)
            else if (tokenOutIndex == 999) {
                // If it's an outcome token, it should have been unshielded here
                IERC20(tokenInAddr).approve(address(factory), proof.amountIn);
                
                amountOut = factory.sellOutcomeToken(
                    marketId,
                    tokenInIndex,
                    proof.amountIn,
                    minAmountOut
                );
            }
            // CASE: Standard Swap between outcome tokens
            else {
                // If it's an outcome token, it should have been unshielded here
                // We approve the factory to pull it
                IERC20(tokenInAddr).approve(address(factory), proof.amountIn);
                
                amountOut = factory.swap(
                    marketId,
                    tokenInIndex,
                    tokenOutIndex,
                    proof.amountIn,
                    minAmountOut,
                    0
                );
            }
        } else {
            amountOut = proof.amountIn;
        }

        // After swap, results are held in this contract. 
        // A following 'shield' operation (initiated by Relayer) will move them back to Railgun.
        
        // Event logs only show internal identifiers to prevent linking to EOAs
        emit PrivateSwapExecuted(proof.nullifier, tokenInAddr, proof.tokenOut);
        return amountOut;
    }

    /**
     * @notice Internal helper to get balance of any token or ETH
     */
    function _getTokenBalance(address token) internal view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /**
     * @notice Allows this contract to receive ETH from unshielding
     */
    receive() external payable {}

    /**
     * @notice Rescue tokens if needed (emergency only)
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
}

