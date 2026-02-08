// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20
 * @notice Interface for ERC20 token
 */
interface IERC20 {
    /**
     * @notice Returns the amount of tokens in existence
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the amount of tokens owned by `account`
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Moves `amount` tokens from the caller's account to `to`
     * @return bool True if transfer succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Sets `amount` as the allowance of `spender` over the caller's tokens
     * @return bool True if approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner`
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @notice Moves `amount` tokens from `from` to `to` using the allowance mechanism
     * @return bool True if transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Emitted when `value` tokens are moved from one account (`from`) to another (`to`)
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted when the allowance of a `spender` for an `owner` is set
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
