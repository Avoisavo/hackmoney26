// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OutcomeToken
 * @notice ERC20 token representing a YES position in a prediction market outcome
 * @dev Each outcome in a market gets its own OutcomeToken (e.g., TokenA_YES, TokenB_YES, TokenC_YES)
 */
contract OutcomeToken is ERC20, Ownable {
    /// @notice Unique identifier for the market this token belongs to
    bytes32 public marketId;

    /// @notice Index of this outcome in the market (0, 1, 2, ...)
    uint256 public outcomeIndex;

    /// @notice Human-readable name of this outcome
    string public outcomeName;

    /// @notice Whether the market has been resolved
    bool public isResolved;

    /// @notice Whether this outcome is the winning outcome
    bool public isWinningOutcome;

    /// @notice Emitted when tokens are minted
    event Minted(address indexed user, uint256 amount);

    /// @notice Emitted when tokens are burned
    event Burned(address indexed user, uint256 amount);

    /// @notice Emitted when tokens are redeemed after resolution
    event Redeemed(address indexed user, uint256 amount);

    /// @notice Emitted when the market is resolved
    event ResolutionSet(bool isWinning);

    /**
     * @notice Constructor for OutcomeToken
     * @param _name Token name (e.g., "Candidate A Token")
     * @param _symbol Token symbol (e.g., "YES_A")
     * @param _marketId Market identifier
     * @param _outcomeIndex Index of this outcome (0-based)
     * @param _outcomeName Human-readable outcome name
     */
    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _marketId,
        uint256 _outcomeIndex,
        string memory _outcomeName
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        marketId = _marketId;
        outcomeIndex = _outcomeIndex;
        outcomeName = _outcomeName;
        isResolved = false;
        isWinningOutcome = false;
    }

    /**
     * @notice Mint tokens when user provides collateral
     * @dev Only callable by market owner (factory or pool)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn tokens (e.g., when selling position)
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    /**
     * @notice Set the resolution status for this outcome
     * @dev Only callable by market owner after market ends
     * @param _isWinning Whether this outcome is the winner
     */
    function setResolution(bool _isWinning) external onlyOwner {
        require(!isResolved, "OutcomeToken: Already resolved");

        isResolved = true;
        isWinningOutcome = _isWinning;

        emit ResolutionSet(_isWinning);
    }

    /**
     * @notice Redeem winning tokens for collateral
     * @dev Can only be called after resolution, only for winning outcomes
     * @param amount Amount of tokens to redeem
     */
    function redeem(uint256 amount) external {
        require(isResolved, "OutcomeToken: Market not resolved");
        require(isWinningOutcome, "OutcomeToken: Not winning outcome");
        require(balanceOf(msg.sender) >= amount, "OutcomeToken: Insufficient balance");

        _burn(msg.sender, amount);
        emit Redeemed(msg.sender, amount);
    }

    /**
     * @notice Get the implied probability of this outcome based on supply
     * @dev Probability = (total supply + collateral) / (total supply * 2)
     * @return probability Implied probability (scaled by 1e18)
     */
    function getImpliedProbability() external view returns (uint256 probability) {
        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) {
            return 0.5e18; // 50% if no tokens issued yet
        }

        // Simple probability calculation based on supply
        // Higher supply = higher probability
        // This will be overridden by actual pool prices
        uint256 price = (totalSupply * 1e18) / (totalSupply + 1e18);
        return price;
    }
}
