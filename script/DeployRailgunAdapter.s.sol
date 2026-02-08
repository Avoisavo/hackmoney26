// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RailgunPrivacyAdapter} from "../contracts/src/RailgunPrivacyAdapter.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployRailgunAdapter
 * @notice Script to deploy RailgunPrivacyAdapter for private trading
 * @dev Deploy adapter to Sepolia testnet
 * @custom:security-contact security@example.com
 */
contract DeployRailgunAdapter is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deployed factory address on Sepolia
        address factoryAddress = 0x2b6c84247A0E777Af6326f3486ad798F776A47Fd;

        // Deploy adapter with constructor parameters
        RailgunPrivacyAdapter adapter = new RailgunPrivacyAdapter(
            PredictionMarketFactory(factoryAddress),              // PredictionMarketFactory
            IERC20(0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9),  // WETH (Sepolia collateral)
            0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea            // OFFICIAL Railgun Proxy (Sepolia)
        );

        vm.stopBroadcast();

        console.log("=====================================");
        console.log("RailgunPrivacyAdapter Deployed!");
        console.log("=====================================");
        console.log("Adapter Address:", address(adapter));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Copy this address");
        console.log("2. Update frontend/lib/constants.ts");
        console.log("3. Run: forge script script/CreateTestMarket.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast");
        console.log("=====================================");
    }
}
