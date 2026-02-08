// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice A mock ERC20 token for testing purposes
 * @dev Used as collateral token in prediction markets
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    /**
     * @notice Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Token decimals
     */
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /**
     * @notice Mint tokens to an address
     * @dev Only for testing - anyone can mint
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Get token decimals
     * @return Decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
