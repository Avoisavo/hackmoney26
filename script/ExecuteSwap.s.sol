// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ExecuteSwap
 * @notice Script to execute a real swap on the prediction market
 */
contract ExecuteSwap is Script {
    function run() external returns (bytes32) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Factory address
        PredictionMarketFactory factory = PredictionMarketFactory(
            0x13B1Ef229f67CA57399f7363D6C1148094d86FBa
        );

        // Market ID
        bytes32 marketId = 0xa5ff24e4e9eabe6ac3d4549232078b6c344134bc4e1b7bbd6458c89935d4cd53;

        // Outcome token addresses
        address tokenA = 0x9a601cA06e3615F8Dd9B747f1aeb8DC38788ab47;
        address tokenB = 0xE27B0eB30B41B546254F5dCDC9214DD696a5c152;

        // Swap parameters
        uint256 tokenInIndex = 0;  // Candidate A token
        uint256 tokenOutIndex = 1; // Candidate B token
        uint256 amountIn = 100 * 1e18; // 100 tokens
        uint256 minAmountOut = 95 * 1e18; // Minimum 95 tokens out (5% slippage)
        uint160 sqrtPriceLimitX96 = 0; // No price limit

        // Approve factory to spend Token A
        IERC20(tokenA).approve(address(factory), amountIn);

        // Execute swap
        factory.swap(
            marketId,
            tokenInIndex,
            tokenOutIndex,
            amountIn,
            minAmountOut,
            sqrtPriceLimitX96
        );

        vm.stopBroadcast();

        console.log("=====================================");
        console.log("Swap Executed!");
        console.log("=====================================");
        console.log("Market ID:", vm.toString(marketId));
        console.log("Traded Token In:", tokenInIndex);
        console.log("Traded Token Out:", tokenOutIndex);
        console.log("Amount In:", amountIn);
        console.log("Min Amount Out:", minAmountOut);
        console.log("=====================================");

        return marketId;
    }
}
