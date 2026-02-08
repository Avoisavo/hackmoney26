// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {RailgunPrivacyAdapter} from "../src/RailgunPrivacyAdapter.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {UMAOptimisticOracle} from "../src/UMAOptimisticOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolManager} from "v4-core/PoolManager.sol";

contract DeployRailgunAdapter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0x2a6d26434a85072869eb4ccadf27921a0c786a62f1331335cc0734ef8d726e06));
        
        // Sepolia Constants
        address poolManager = 0xd439886628539bce073347BE317fc3ca222F66d9;
        address oracle = 0x7608B6DEA4781bCFDD036834FF85c0A034477920;
        address weth = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
        address railgunRouter = 0x0000000000000000000000000000000000000000;

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy New Factory with WETH as collateral
        PredictionMarketFactory factory = new PredictionMarketFactory(
            PoolManager(poolManager),
            UMAOptimisticOracle(payable(oracle)),
            IERC20(weth)
        );

        // 2. Deploy Adapter linked to new factory and WETH
        RailgunPrivacyAdapter adapter = new RailgunPrivacyAdapter(
            factory,
            IERC20(weth),
            railgunRouter
        );

        console.log("New PredictionMarketFactory deployed to:", address(factory));
        console.log("New RailgunPrivacyAdapter deployed to:", address(adapter));

        vm.stopBroadcast();
    }
}
