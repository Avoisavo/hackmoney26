// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";
import {UMAOptimisticOracle} from "../contracts/src/UMAOptimisticOracle.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployAll
 * @notice Deploy UMA Oracle, Prediction Market Factory, Railgun Adapter
 * @dev Complete deployment script for Sepolia testnet
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        console.log("===================================");
        console.log("Deploying UMA Optimistic Oracle...");
        console.log("===================================");

        // Deploy UMA Optimistic Oracle (mock for testing)
        UMAOptimisticOracle oracle = new UMAOptimisticOracle();

        console.log("UMA Oracle deployed to:", address(oracle));
        console.log("");

        console.log("===================================");
        console.log("Deploying PredictionMarketFactory...");
        console.log("===================================");

        // Deploy factory with constructor parameters
        // Use already deployed PoolManager and USDC
        PredictionMarketFactory factory = new PredictionMarketFactory(
            PoolManager(0xd439886628539bce073347BE317fc3ca222F66d9), // PoolManager (Uniswap V4)
            oracle,  // Our deployed UMA Oracle
            IERC20(0xcAe730E167394CD5763aEcAB91a9B8eBAF130A4B)  // USDC (Sepolia)
        );

        console.log("Factory deployed to:", address(factory));
        console.log("");

        vm.stopBroadcast();

        console.log("===================================");
        console.log("Deployment Complete!");
        console.log("===================================");
        console.log("UMA Oracle:", address(oracle));
        console.log("Factory:", address(factory));
        console.log("");
        console.log("Update frontend/lib/constants.ts:");
        console.log("export const ORACLE_ADDRESS = '", address(oracle), "' as const;");
        console.log("export const FACTORY_ADDRESS = '", address(factory), "' as const;");
        console.log("===================================");
    }
}
