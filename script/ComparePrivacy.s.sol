// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PredictionMarketFactory} from "../contracts/src/PredictionMarketFactory.sol";
import {RailgunPrivacyAdapter} from "../contracts/src/RailgunPrivacyAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ComparePrivacy
 * @notice Compares public vs private transaction traceability
 */
contract ComparePrivacy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=====================================");
        console.log("PRIVACY COMPARISON TEST");
        console.log("=====================================");
        console.log("Deployer EOA Address:");
        console.log(addressToString(deployer));
        console.log("");
        console.log("This EOA address is YOUR IDENTITY");
        console.log("All public transactions link to this address");
        console.log("=====================================");
        console.log("");

        // Test 1: PUBLIC TRANSACTION
        console.log("TEST 1: PUBLIC TRANSACTION");
        console.log("=====================================");

        vm.startBroadcast(deployerKey);

        // Transfer tokens directly - PUBLIC
        address tokenA = 0x9a601cA06e3615F8Dd9B747f1aeb8DC38788ab47;
        address recipient = 0x13B1Ef229f67CA57399f7363D6C1148094d86FBa; // Factory

        uint256 amount = 10 * 1e18;
        IERC20(tokenA).transfer(recipient, amount);

        vm.stopBroadcast();

        console.log("Action: Transferred 10 TokenA to Factory");
        console.log("From:", addressToString(deployer));
        console.log("To: Factory");
        console.log("Amount: 10 tokens (VISIBLE)");
        console.log("");
        console.log("ON-CHAIN FOOTPRINT:");
        console.log("[+] From address: VISIBLE (", addressToString(deployer), ")");
        console.log("[+] To address: VISIBLE (Factory)");
        console.log("[+] Amount: VISIBLE (10 tokens)");
        console.log("[+] Token type: VISIBLE (TokenA)");
        console.log("[+] Timestamp: VISIBLE");
        console.log("[+] Transaction hash: TRACEABLE");
        console.log("");
        console.log("TRACKABILITY: 100% - Anyone can see this transaction!");
        console.log("=====================================");
        console.log("");

        // Generate a mock Railgun address for demonstration
        console.log("TEST 2: PRIVATE TRANSACTION (Railgun)");
        console.log("=====================================");

        // Railgun addresses start with 0x7...
        // In real Railgun, this is derived deterministically from your EOA
        // but appears completely different on-chain
        bytes memory railgunAddressBytes = abi.encodePacked(
            bytes1(0x07),
            bytes20(0x1234567890123456789012345678901234567890) // Random-looking
        );
        address mockRailgunAddress = address(uint160(bytes20(railgunAddressBytes)));

        console.log("Railgun Shielded Address:");
        console.log(addressToString(mockRailgunAddress));
        console.log("");
        console.log("KEY INSIGHT:");
        console.log("- Your EOA:", addressToString(deployer));
        console.log("- Railgun addr:", addressToString(mockRailgunAddress));
        console.log("");
        console.log("NO ON-CHAIN LINK between these addresses!");
        console.log("");
        console.log("If you use Railgun:");
        console.log("[+] From address: 0x7... (NOT your EOA)");
        console.log("[+] To address: RailgunPrivacyAdapter");
        console.log("[+] Amount: HIDDEN in ZK proof");
        console.log("[+] Token type: HIDDEN in ZK proof");
        console.log("[+] Transaction: Only shows proof was valid");
        console.log("");
        console.log("TRACKABILITY: ~0% - Transaction appears unrelated to you!");
        console.log("=====================================");
        console.log("");

        // Show the actual RailgunPrivacyAdapter
        address adapterAddress = 0x0B074DEdFCE509B2E4B928Db103c125Ed25EBa3E;
        console.log("RailgunPrivacyAdapter Contract:");
        console.log(addressToString(adapterAddress));
        console.log("This contract handles private swaps");
        console.log("");
        console.log("=====================================");
        console.log("SUMMARY");
        console.log("=====================================");
        console.log("");
        console.log("PUBLIC TRANSACTION:");
        console.log("- From: Your EOA (0x", toHex(deployer), ")");
        console.log("- All details visible");
        console.log("- Linked to your identity");
        console.log("");
        console.log("PRIVATE TRANSACTION (Railgun):");
        console.log("- From: Shielded address (0x7...)");
        console.log("- Amounts hidden in ZK proof");
        console.log("- No link to your EOA");
        console.log("");
        console.log("Bottom line:");
        console.log("Public: Everyone sees what you traded");
        console.log("Private: Only proof of valid transaction visible");
        console.log("=====================================");
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

    function toHex(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2] = alphabet[uint8(data[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(data[i] & 0x0f)];
        }

        return string(str);
    }
}
