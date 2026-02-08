// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";

/**
 * @title MintOutcomeTokens
 * @notice Script to mint outcome tokens using factory's mintTokens function
 */
contract MintOutcomeTokens is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Factory address
        PredictionMarketFactory factory = PredictionMarketFactory(0x13B1Ef229f67CA57399f7363D6C1148094d86FBa);

        // Market ID
        bytes32 marketId = 0xa5ff24e4e9eabe6ac3d4549232078b6c344134bc4e1b7bbd6458c89935d4cd53;

        // Recipient (deployer)
        address recipient = 0xeeE45D8d163D85b8E0315b57A969fA81679df8D2;

        // Amount of each token to mint (1000 tokens)
        uint256 amount = 1000 * 1e18;

        // Mint tokens
        factory.mintTokens(marketId, recipient, amount);

        vm.stopBroadcast();

        console.log("=====================================");
        console.log("Outcome Tokens Minted!");
        console.log("=====================================");
        console.log("Market ID:", vm.toString(marketId));
        console.log("Recipient:", recipient);
        console.log("Amount Each:", amount);
        console.log("=====================================");
    }
}
