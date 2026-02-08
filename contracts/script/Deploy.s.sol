// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {UMAOptimisticOracle} from "../src/UMAOptimisticOracle.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {PoolManager} from "v4-core/PoolManager.sol";

/**
 * @title Deploy
 * @notice Deployment script for Prediction Market contracts
 * @dev Deploys PoolManager (or uses existing), UMA Oracle, Collateral Token, and Factory
 */
contract Deploy is Script {
    MockERC20 public collateralToken;
    UMAOptimisticOracle public oracle;
    PredictionMarketFactory public factory;
    PoolManager public poolManager;

    function run() external {
        uint256 deployerPrivateKey = 0x2a6d26434a85072869eb4ccadf27921a0c786a62f1331335cc0734ef8d726e06;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with address:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy or get PoolManager
        // Note: On testnet, PoolManager might already be deployed
        // For now, we'll deploy a new one
        console.log("Deploying PoolManager...");
        poolManager = new PoolManager(
            0x0000000000000000000000000000000000000000 // No protocol fees initially
        );
        console.log("PoolManager deployed to:", address(poolManager));

        // 2. Deploy UMA Optimistic Oracle
        console.log("Deploying UMA Optimistic Oracle...");
        oracle = new UMAOptimisticOracle();
        console.log("UMA Oracle deployed to:", address(oracle));

        // 3. Deploy Mock Collateral Token (USDC-like)
        console.log("Deploying Mock Collateral Token...");
        collateralToken = new MockERC20("USD Coin", "USDC", 6);
        console.log("Collateral Token deployed to:", address(collateralToken));

        // 4. Deploy Prediction Market Factory
        console.log("Deploying Prediction Market Factory...");
        factory = new PredictionMarketFactory(
            poolManager,
            oracle,
            collateralToken
        );
        console.log("Factory deployed to:", address(factory));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("PoolManager:", address(poolManager));
        console.log("UMA Oracle:", address(oracle));
        console.log("Collateral Token:", address(collateralToken));
        console.log("Factory:", address(factory));
        console.log("Owner:", deployer);
    }
}
