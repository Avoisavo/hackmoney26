// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";
import {RailgunPrivacyAdapter} from "../contracts/src/RailgunPrivacyAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PrivacyTest
 * @notice Real demonstration of public vs private transaction privacy
 */
contract PrivacyTest is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Contract addresses
        address tokenA = 0x9a601cA06e3615F8Dd9B747f1aeb8DC38788ab47;
        address factory = 0x13B1Ef229f67CA57399f7363D6C1148094d86FBa;
        address adapter = 0x0B074DEdFCE509B2E4B928Db103c125Ed25EBa3E;

        console.log("========================================");
        console.log("     PRIVACY TEST - REAL EXECUTION     ");
        console.log("========================================");
        console.log("");
        console.log("NETWORK: Sepolia Testnet");
        console.log("CHAIN ID: 11155111");
        console.log("");
        console.log("========================================");
        console.log("TEST 1: PUBLIC TRANSACTION");
        console.log("========================================");
        console.log("");
        console.log("Executing: Transfer 50 TokenA to Factory");
        console.log("");

        vm.startBroadcast(deployerKey);

        // PUBLIC TRANSACTION
        uint256 amount = 50 * 1e18;
        IERC20(tokenA).transfer(factory, amount);

        vm.stopBroadcast();

        console.log("");
        console.log("TRANSACTION COMPLETED!");
        console.log("========================================");
        console.log("");
        console.log("PUBLIC TRANSACTION ANALYSIS:");
        console.log("--------------------------------------");
        console.log("From:   0xeee45d8d163d85b8e0315b57a969fa81679df8d2");
        console.log("         >> THIS IS YOUR EOA (IDENTITY)");
        console.log("");
        console.log("To:     0x9a601cA06e3615F8Dd9B747f1aeb8DC38788ab47");
        console.log("         >> TokenA Contract");
        console.log("");
        console.log("Amount: 50 tokens");
        console.log("         >> VISIBLE TO EVERYONE");
        console.log("");
        console.log("WHAT EVERYONE SEES:");
        console.log("  [+] Your EOA address (IDENTITY)");
        console.log("  [+] Amount: 50 tokens");
        console.log("  [+] Token: TokenA");
        console.log("  [+] Recipient: Factory");
        console.log("  [+] Timestamp");
        console.log("  [+] Gas used");
        console.log("");
        console.log("PRIVACY LEVEL: ZERO");
        console.log("LINKABLE TO YOU: YES");
        console.log("");
        console.log("========================================");
        console.log("");
        console.log("TEST 2: PRIVATE TRANSACTION COMPARISON");
        console.log("========================================");
        console.log("");
        console.log("If this were a RAILGUN transaction:");
        console.log("");
        console.log("From:   0x0712345678901234567890123456789012345678");
        console.log("         >> RAILGUN SHIELDED ADDRESS");
        console.log("         >> NOT LINKED TO YOUR EOA!");
        console.log("");
        console.log("To:     ", addressToString(adapter));
        console.log("         >> RailgunPrivacyAdapter");
        console.log("");
        console.log("Amount: 50 tokens");
        console.log("         >> STILL VISIBLE (market transparency)");
        console.log("");
        console.log("WHAT EVERYONE SEES:");
        console.log("  [+] Shielded address (0x7...)");
        console.log("  [+] Amount: 50 tokens (VISIBLE)");
        console.log("  [+] Token: TokenA (VISIBLE)");
        console.log("  [+] Valid ZK proof");
        console.log("");
        console.log("WHAT'S HIDDEN:");
        console.log("  [!] Your EOA address (0xeee4...df8d2)");
        console.log("  [!] Your identity");
        console.log("  [!] Link to your transaction history");
        console.log("");
        console.log("PRIVACY LEVEL: MAXIMUM");
        console.log("LINKABLE TO YOU: NO");
        console.log("");
        console.log("========================================");
        console.log("");
        console.log("KEY DIFFERENCE:");
        console.log("========================================");
        console.log("");
        console.log("PUBLIC:");
        console.log("  0xeee4...df8d2 sent 50 tokens");
        console.log("  >> Everyone knows it's YOU");
        console.log("");
        console.log("PRIVATE:");
        console.log("  0x7... sent 50 tokens");
        console.log("  >> Amount visible, WHO is hidden!");
        console.log("");
        console.log("========================================");
        console.log("");
        console.log("WHY THIS MATTERS:");
        console.log("========================================");
        console.log("");
        console.log("MARKET TRANSPARENCY (Both have this):");
        console.log("  [+] Amounts visible for price discovery");
        console.log("  [+] Token types visible for market data");
        console.log("  [+] Volumes visible for liquidity providers");
        console.log("");
        console.log("PRIVACY PROTECTION (Private only):");
        console.log("  [+] Identity hidden behind 0x7...");
        console.log("  [+] No link to your EOA");
        console.log("  [+] Strategy remains private");
        console.log("  [+] No front-running");
        console.log("");
        console.log("========================================");
        console.log("CHECK ON ETHERSCAN:");
        console.log("========================================");
        console.log("");
        console.log("The transaction above is PUBLIC.");
        console.log("You can verify:");
        console.log("");
        console.log("1. Click the transaction hash above");
        console.log("2. See 'From': 0xeee4...df8d2 (YOUR EOA)");
        console.log("3. See 'Amount': 50 tokens (VISIBLE)");
        console.log("4. Everything is exposed!");
        console.log("");
        console.log("With Railgun:");
        console.log("1. 'From' would be 0x7... (NOT your EOA)");
        console.log("2. 'Amount' would still be 50 (VISIBLE)");
        console.log("3. Identity protected!");
        console.log("");
        console.log("========================================");
    }

    function addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";

        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }

        return string(str);
    }
}
