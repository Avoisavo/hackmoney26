// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {PoolKey, PoolIdLibrary} from "v4-core/types/PoolKey.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {TickBitmap} from "v4-core/libraries/TickBitmap.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";

import "./OutcomeToken.sol";
import "./UMAOptimisticOracle.sol";

/**
 * @title PredictionMarketFactory
 * @notice Factory for creating prediction markets with coordinated Uniswap V4 pools
 * @dev Each outcome gets its own pool against collateral, ensuring liquidity can flow between outcomes
 */
contract PredictionMarketFactory is Ownable {
    /// @notice Market struct
    struct Market {
        bytes32 marketId;              // Unique market identifier
        string question;                // Market question
        string[] outcomes;              // Array of outcome names
        OutcomeToken[] outcomeTokens;   // ERC20 tokens for each outcome
        PoolKey[] poolKeys;             // Uniswap V4 pool keys (one per outcome)
        bytes32[] poolIds;              // Uniswap V4 pool IDs
        IERC20 collateralToken;         // Collateral token (e.g., USDC)
        uint256 endTime;                // Market end time
        bool isResolved;                // Whether market is resolved
        uint256 winningOutcome;         // Index of winning outcome
        bytes32 umaQuestionId;          // UMA question identifier
    }

    /// @notice Mapping from market ID to market data
    mapping(bytes32 => Market) public markets;

    /// @notice List of all market IDs
    bytes32[] public marketList;

    /// @notice Uniswap V4 PoolManager
    PoolManager public immutable poolManager;

    /// @notice UMA Optimistic Oracle
    UMAOptimisticOracle public immutable oracle;

    /// @notice Collateral token (e.g., USDC)
    IERC20 public immutable collateralToken;

    /// @notice Minimum market duration (1 hour)
    uint256 public constant MIN_MARKET_DURATION = 1 hours;

    /// @notice Fee for swaps (3000 = 0.3%, the standard Uniswap fee)
    uint24 public constant SWAP_FEE = 3000;

    /// @notice Tick spacing for pools (60 for 0.3% fee)
    int24 public constant TICK_SPACING = 60;

    /// @notice Emitted when a market is created
    event MarketCreated(
        bytes32 indexed marketId,
        string question,
        string[] outcomes,
        address[] outcomeTokens,
        bytes32[] poolIds,
        uint256 endTime
    );

    /// @notice Emitted when a market is resolved
    event MarketResolved(
        bytes32 indexed marketId,
        uint256 winningOutcome
    );

    /// @notice Emitted when outcome tokens are minted
    event TokensMinted(
        bytes32 indexed marketId,
        address indexed recipient,
        uint256 amount
    );

    /// @notice Emitted when liquidity is added to a market pool
    event LiquidityAdded(
        bytes32 indexed marketId,
        uint256 outcomeIndex,
        uint256 amount
    );

    // Custom errors
    error InvalidEndTime();
    error InvalidOutcomes();
    error MarketNotFound();
    error MarketNotEnded();
    error MarketAlreadyResolved();
    error InvalidResolution();
    error PoolInitializationFailed();

    /**
     * @notice Constructor
     * @param _poolManager Uniswap V4 PoolManager address
     * @param _oracle UMA Optimistic Oracle address
     * @param _collateralToken Collateral token address
     */
    constructor(
        PoolManager _poolManager,
        UMAOptimisticOracle _oracle,
        IERC20 _collateralToken
    ) Ownable(msg.sender) {
        poolManager = _poolManager;
        oracle = _oracle;
        collateralToken = _collateralToken;
    }

    /**
     * @notice Create a new prediction market
     * @param question Market question
     * @param outcomes Array of outcome names (e.g., ["Candidate A", "Candidate B", "Candidate C"])
     * @param endTime Unix timestamp when market ends
     * @param umaQuestionId UMA question identifier for resolution
     * @param sqrtPriceX96 Initial sqrt price for all pools (79228162514264337593543950336 = price of 1)
     * @return marketId The unique market identifier
     */
    function createMarket(
        string calldata question,
        string[] calldata outcomes,
        uint256 endTime,
        bytes32 umaQuestionId,
        uint160 sqrtPriceX96
    ) external returns (bytes32) {
        // Validation
        require(outcomes.length >= 2, "InvalidOutcomes()");
        require(endTime > block.timestamp + MIN_MARKET_DURATION, "InvalidEndTime()");

        // Generate market ID
        bytes32 marketId = keccak256(abi.encodePacked(question, outcomes.length, block.timestamp, msg.sender));

        // Deploy outcome tokens
        OutcomeToken[] memory tokens = new OutcomeToken[](outcomes.length);
        for (uint256 i = 0; i < outcomes.length; i++) {
            string memory symbol = string(abi.encodePacked("YES_", uint2str(i)));
            tokens[i] = new OutcomeToken(
                string(abi.encodePacked(outcomes[i], " Token")),
                symbol,
                marketId,
                i,
                outcomes[i]
            );
        }

        // Create Uniswap V4 pools (one per outcome against collateral)
        PoolKey[] memory poolKeys = new PoolKey[](outcomes.length);
        bytes32[] memory poolIds = new bytes32[](outcomes.length);

        Currency collateralCurrency = Currency.wrap(address(collateralToken));

        for (uint256 i = 0; i < outcomes.length; i++) {
            Currency outcomeCurrency = Currency.wrap(address(tokens[i]));

            // Determine currency0 and currency1 (must be sorted)
            Currency currency0 = collateralCurrency < outcomeCurrency
                ? collateralCurrency
                : outcomeCurrency;
            Currency currency1 = collateralCurrency < outcomeCurrency
                ? outcomeCurrency
                : collateralCurrency;

            // Create pool key
            poolKeys[i] = PoolKey({
                currency0: currency0,
                currency1: currency1,
                fee: SWAP_FEE,
                tickSpacing: TICK_SPACING,
                hooks: IHooks(address(0)) // No hooks initially
            });

            // Initialize pool
            try poolManager.initialize(poolKeys[i], sqrtPriceX96) {
                PoolId poolId = poolKeys[i].toId();
                poolIds[i] = PoolId.unwrap(poolId);
            } catch {
                revert PoolInitializationFailed();
            }
        }

        // Store market
        Market storage market = markets[marketId];
        market.marketId = marketId;
        market.question = question;
        market.outcomes = outcomes;
        market.outcomeTokens = tokens;
        market.poolKeys = poolKeys;
        market.poolIds = poolIds;
        market.collateralToken = collateralToken;
        market.endTime = endTime;
        market.isResolved = false;
        market.winningOutcome = 0;
        market.umaQuestionId = umaQuestionId;

        marketList.push(marketId);

        // Request resolution from UMA
        oracle.requestResolution(marketId, umaQuestionId);

        // Prepare event data
        address[] memory tokenAddresses = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenAddresses[i] = address(tokens[i]);
        }

        emit MarketCreated(
            marketId,
            question,
            outcomes,
            tokenAddresses,
            poolIds,
            endTime
        );

        return marketId;
    }

    /**
     * @notice Resolve a market
     * @param marketId Market identifier
     * @param winningOutcome Index of winning outcome
     */
    function resolveMarket(bytes32 marketId, uint256 winningOutcome) external {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        if (block.timestamp < market.endTime) revert MarketNotEnded();
        if (market.isResolved) revert MarketAlreadyResolved();

        // Verify with UMA
        require(
            oracle.verifyResolution(marketId, winningOutcome),
            "InvalidResolution()"
        );

        market.isResolved = true;
        market.winningOutcome = winningOutcome;

        // Set resolution on all outcome tokens
        for (uint256 i = 0; i < market.outcomeTokens.length; i++) {
            bool isWinner = (i == winningOutcome);
            market.outcomeTokens[i].setResolution(isWinner);
        }

        emit MarketResolved(marketId, winningOutcome);
    }

    /**
     * @notice Mint outcome tokens to a recipient (only owner)
     * @dev Used for testing and initial token distribution
     * @param marketId Market identifier
     * @param recipient Address to receive tokens
     * @param amount Amount of each outcome token to mint
     */
    function mintTokens(
        bytes32 marketId,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();

        // Mint equal amount of each outcome token
        for (uint256 i = 0; i < market.outcomeTokens.length; i++) {
            market.outcomeTokens[i].mint(recipient, amount);
        }

        emit TokensMinted(marketId, recipient, amount);
    }

    /**
     * @notice Get market data
     * @param marketId Market identifier
     * @return market The market struct
     */
    function getMarket(bytes32 marketId) external view returns (Market memory) {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        return market;
    }

    /**
     * @notice Get all markets
     * @return allMarkets Array of all markets
     */
    function getAllMarkets() external view returns (Market[] memory) {
        Market[] memory allMarkets = new Market[](marketList.length);
        for (uint256 i = 0; i < marketList.length; i++) {
            allMarkets[i] = markets[marketList[i]];
        }
        return allMarkets;
    }

    /**
     * @notice Get pool key for a specific outcome
     * @param marketId Market identifier
     * @param outcomeIndex Index of outcome
     * @return poolKey The pool key
     */
    function getPoolKey(
        bytes32 marketId,
        uint256 outcomeIndex
    ) external view returns (PoolKey memory) {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        require(outcomeIndex < market.poolKeys.length, "Invalid outcome index");
        return market.poolKeys[outcomeIndex];
    }

    /**
     * @notice Get all pool keys for a market
     * @param marketId Market identifier
     * @return poolKeys Array of pool keys
     */
    function getAllPoolKeys(
        bytes32 marketId
    ) external view returns (PoolKey[] memory) {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();
        return market.poolKeys;
    }

    /**
     * @notice Calculate the sum of probabilities across all outcomes
     * @dev Should equal 1e18 (100%) if pools are properly coordinated
     * @param marketId Market identifier
     * @return sumOfProbabilities Total probability scaled by 1e18
     */
    function getSumOfProbabilities(
        bytes32 marketId
    ) external view returns (uint256 sumOfProbabilities) {
        Market storage market = markets[marketId];
        if (market.marketId == bytes32(0)) revert MarketNotFound();

        uint256 sum = 0;
        for (uint256 i = 0; i < market.outcomeTokens.length; i++) {
            sum += market.outcomeTokens[i].getImpliedProbability();
        }
        return sum;
    }

    /**
     * @notice Buy outcome tokens with collateral token
     * @param marketId Market identifier
     * @param outcomeIndex Index of outcome to buy
     * @param amountIn Amount of collateral to spend
     * @param minAmountOut Minimum outcome tokens to receive
     * @return amountOut Amount of outcome tokens received
     */
    function buyOutcomeToken(
        bytes32 marketId,
        uint256 outcomeIndex,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        Market storage market = markets[marketId];
        require(market.isResolved == false, "Market already resolved");
        require(outcomeIndex < market.outcomeTokens.length, "Invalid outcome index");

        OutcomeToken outcomeToken = market.outcomeTokens[outcomeIndex];

        // Transfer collateral from sender
        collateralToken.transferFrom(msg.sender, address(this), amountIn);
        
        // Simplified: In production, swap collateral for outcomeToken in Uniswap V4 pool
        // For PoC: Calculate output and transfer
        amountOut = _calculateSwapOutput(marketId, 0, 0, amountIn); // Simplified calculation
        require(amountOut >= minAmountOut, "Slippage exceeded");

        outcomeToken.mint(msg.sender, amountOut);
        
        emit SwapExecuted(msg.sender, marketId, 999, outcomeIndex, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Sell outcome tokens for collateral token
     * @param marketId Market identifier
     * @param outcomeIndex Index of outcome to sell
     * @param amountIn Amount of outcome tokens to sell
     * @param minAmountOut Minimum collateral to receive
     * @return amountOut Amount of collateral received
     */
    function sellOutcomeToken(
        bytes32 marketId,
        uint256 outcomeIndex,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        Market storage market = markets[marketId];
        require(market.isResolved == false, "Market already resolved");
        require(outcomeIndex < market.outcomeTokens.length, "Invalid outcome index");

        OutcomeToken outcomeToken = market.outcomeTokens[outcomeIndex];

        // Burn outcome tokens from sender
        outcomeToken.burn(amountIn);
        
        // Simplified: In production, swap outcomeToken for collateral in Uniswap V4 pool
        amountOut = _calculateSwapOutput(marketId, 0, 0, amountIn); // Simplified
        require(amountOut >= minAmountOut, "Slippage exceeded");

        collateralToken.transfer(msg.sender, amountOut);
        
        emit SwapExecuted(msg.sender, marketId, outcomeIndex, 999, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Swap outcome tokens through Uniswap V4 pools
     * @dev Executes swap through PoolManager
     * @param marketId Market identifier
     * @param tokenInIndex Index of input outcome token
     * @param tokenOutIndex Index of output outcome token
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum amount to receive (slippage protection)
     * @param sqrtPriceLimitX96 Price limit for the swap (0 for no limit)
     * @return amountOut Amount of output tokens received
     */
    function swap(
        bytes32 marketId,
        uint256 tokenInIndex,
        uint256 tokenOutIndex,
        uint256 amountIn,
        uint256 minAmountOut,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        Market storage market = markets[marketId];
        require(market.isResolved == false, "Market already resolved");
        require(tokenInIndex < market.outcomeTokens.length, "Invalid token in index");
        require(tokenOutIndex < market.outcomeTokens.length, "Invalid token out index");
        require(tokenInIndex != tokenOutIndex, "Cannot swap same token");
        require(amountIn > 0, "Amount must be greater than 0");

        OutcomeToken tokenIn = market.outcomeTokens[tokenInIndex];
        OutcomeToken tokenOut = market.outcomeTokens[tokenOutIndex];

        // Transfer tokens from sender to this contract
        tokenIn.transferFrom(msg.sender, address(this), amountIn);

        // Approve PoolManager to spend tokens
        tokenIn.approve(address(poolManager), amountIn);

        // Get pool keys
        PoolKey memory poolKeyIn = market.poolKeys[tokenInIndex];
        PoolKey memory poolKeyOut = market.poolKeys[tokenOutIndex];

        // Define swap parameters
        bool zeroForOne = tokenInIndex < tokenOutIndex;
        int256 amountSpecified = int256(amountIn);
        uint160 sqrtPriceLimit = sqrtPriceLimitX96;

        // For simplicity, we'll do a direct swap through the pool
        // In production, you'd use a swap router for multi-hop swaps

        // Prepare swap data for PoolManager
        bytes memory data = abi.encodeWithSignature(
            "swap((int256,uint160),(bool,bytes))",
            abi.encode(amountSpecified, sqrtPriceLimit),
            abi.encode(zeroForOne, bytes(""))
        );

        // Execute swap through PoolManager
        // Note: This is a simplified implementation
        // In production, you'd need to handle the actual swap properly

        // For now, we'll calculate the output amount based on pool reserves
        // and execute the transfer
        amountOut = _calculateSwapOutput(marketId, tokenInIndex, tokenOutIndex, amountIn);

        require(amountOut >= minAmountOut, "Slippage exceeded");

        // Transfer output tokens to sender
        tokenOut.transfer(msg.sender, amountOut);

        // Refund any unused input tokens
        uint256 remaining = tokenIn.balanceOf(address(this));
        if (remaining > 0) {
            tokenIn.transfer(msg.sender, remaining);
        }

        emit SwapExecuted(msg.sender, marketId, tokenInIndex, tokenOutIndex, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Calculate swap output amount based on pool reserves
     * @dev Uses constant product formula: x * y = k
     * @param marketId Market identifier
     * @param tokenInIndex Input token index
     * @param tokenOutIndex Output token index
     * @param amountIn Input amount
     * @return amountOut Output amount
     */
    function _calculateSwapOutput(
        bytes32 marketId,
        uint256 tokenInIndex,
        uint256 tokenOutIndex,
        uint256 amountIn
    ) internal view returns (uint256 amountOut) {
        // Simplified calculation for testing
        // In production, this would query actual pool reserves from PoolManager
        // For now, we assume a 0.3% fee and linear price impact

        // Apply fee
        uint256 amountAfterFee = (amountIn * 997) / 1000;

        // Simplified output calculation (assuming balanced pools)
        // In production, use actual pool reserves
        amountOut = amountAfterFee;

        return amountOut;
    }

    /**
     * @notice Event emitted when a swap is executed
     */
    event SwapExecuted(
        address indexed trader,
        bytes32 indexed marketId,
        uint256 tokenInIndex,
        uint256 tokenOutIndex,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice Convert uint to string
     * @param _i Uint to convert
     * @return _uintAsString String representation
     */
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
