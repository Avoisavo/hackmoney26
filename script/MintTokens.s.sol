// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {OutcomeToken} from "../contracts/src/OutcomeToken.sol";

/**
 * @title MintTokens
 * @notice Script to mint outcome tokens for testing
 * @dev Mints outcome tokens directly to test trading
 */
contract MintTokens is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Outcome token addresses from market creation
        // Market ID: 0x7f776f59b6ee864a7edb511fdaf7f4681864ad8301144f05a3a7b5e96b19eb50
        address tokenA = 0x67F519462348942270A7709EF66Cf30551606FBa;
        address tokenB = 0xBC69d98F5c51D01C15e69AEB14CeaB1aE4fc7Ca1;
        address tokenC = 0xE5F283E1Ca2D499Ec677164aCEfE6205D5Bc9a52;

        address recipient = 0xeeE45D8d163D85b8E0315b57A969fA81679df8D2;
        uint256 amount = 1000 * 1e18; // 1000 tokens

        // Mint tokens to recipient
        OutcomeToken(tokenA).mint(recipient, amount);
        OutcomeToken(tokenB).mint(recipient, amount);
        OutcomeToken(tokenC).mint(recipient, amount);

        vm.stopBroadcast();

        console.log("=====================================");
        console.log("Outcome Tokens Minted!");
        console.log("=====================================");
        console.log("Token A:", tokenA);
        console.log("Token B:", tokenB);
        console.log("Token C:", tokenC);
        console.log("Recipient:", recipient);
        console.log("Amount Each:", amount);
        console.log("=====================================");
    }
}
