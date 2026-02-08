// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";

/**
 * @title CreateTestMarket
 * @notice Script to create a test prediction market
 * @dev Creates a market for testing singleton pool behavior and trading
 */
contract CreateTestMarket is Script {
    function run() external returns (bytes32) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // UPDATE THIS ADDRESS with the deployed factory address
        PredictionMarketFactory factory = PredictionMarketFactory(
            0xc4345bf8027838e7e9c59f5bb86edae855a3011c
        );

        // Create test market: 2028 US Presidential Election
        string[] memory outcomes = new string[](3);
        outcomes[0] = "Candidate A";
        outcomes[1] = "Candidate B";
        outcomes[2] = "Candidate C";

        bytes32 marketId = factory.createMarket(
            "Who will win the 2028 US Presidential Election?",
            outcomes,
            block.timestamp + 30 days,  // Market ends in 30 days
            bytes32(0),  // Question ID (use real UMA query ID in production)
            79228162514264337593543950336  // Initial sqrt price (price of 1)
        );

        vm.stopBroadcast();

        console.log("=====================================");
        console.log("Test Market Created!");
        console.log("=====================================");
        console.log("Market ID:", vm.toString(marketId));
        console.log("");
        console.log("Question: Who will win the 2028 US Presidential Election?");
        console.log("Outcomes: Candidate A, Candidate B, Candidate C");
        console.log("End Time:", block.timestamp + 30 days);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Copy this Market ID");
        console.log("2. Update frontend/app/page-test-trading/page.tsx");
        console.log("3. Run: forge script script/AddLiquidity.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast");
        console.log("=====================================");

        return marketId;
    }
}
