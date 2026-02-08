// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolManager} from "v4-core/PoolManager.sol";

/**
 * @title DeployPoolManager
 * @notice Simple deployer wrapper for PoolManager
 */
contract DeployPoolManager {
    PoolManager public poolManager;

    constructor(address protocolFeeController) {
        poolManager = new PoolManager(protocolFeeController);
    }
}
