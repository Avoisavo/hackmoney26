// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

interface IWETH is IERC20 {
    function deposit() external payable;
}

/**
 * @title AddLiquidity
 * @notice Script to add initial liquidity to prediction market pools
 * @dev Adds WETH liquidity to all outcome token pools
 */
contract AddLiquidity is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deployed factory address
        PredictionMarketFactory factory = PredictionMarketFactory(
            0x2b6c84247A0E777Af6326f3486ad798F776A47Fd
        );
        // Actual market ID from CreateTestMarket (from logs, not return value)
        bytes32 marketId = 0xf7499e67257a3b6f97cd316cebaf8d460a923898dd0a9f689da78356f2109749;

        // WETH address on Sepolia (18 decimals)
        IWETH weth = IWETH(0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9);

        // Liquidity amount: 1 WETH per pool
        uint256 liquidityAmount = 1 ether;
        uint256 totalNeeded = liquidityAmount * 3;

        console.log("=====================================");
        console.log("Adding Liquidity to Market");
        console.log("=====================================");
        console.log("Market ID:", vm.toString(marketId));
        console.log("Liquidity per Pool:", liquidityAmount / 1e18, "WETH");
        console.log("");

        // Check WETH balance
        uint256 balance = weth.balanceOf(msg.sender);
        console.log("Your WETH Balance:", balance / 1e18, "WETH");

        if (balance < totalNeeded) {
            uint256 toWrap = totalNeeded - balance;
            console.log("Wrapping", toWrap / 1e18, "ETH to WETH...");
            weth.deposit{value: toWrap}();
        }

        // Mint outcome tokens to factory so it can fulfill swaps (PoC mode)
        uint256 mintAmount = 10000 ether;
        console.log("Minting tokens to factory for swaps...");
        factory.mintTokens(marketId, address(factory), mintAmount);

        vm.stopBroadcast();

        console.log("");
        console.log("=====================================");
        console.log("Tokens Minted Successfully!");
        console.log("=====================================");
        console.log("Market ID:", vm.toString(marketId));
        console.log("Minted to Factory:", mintAmount / 1e18, "of each outcome token");
        console.log("");
    }
}
