// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UMAOptimisticOracle
 * @notice Simplified UMA Optimistic Oracle for prediction market resolution
 * @dev In production, integrate with actual UMA Optimistic Oracle v3
 */
contract UMAOptimisticOracle is Ownable(msg.sender) {
    /// @notice Resolution request for a market
    struct ResolutionRequest {
        bytes32 marketId;              // Market identifier
        bytes32 umaQuestionId;         // UMA question identifier
        bool resolved;                 // Whether resolution is final
        uint256 winningOutcome;        // Index of winning outcome
        uint256 requestTime;           // When request was made
        address proposer;              // Address that proposed outcome
        uint256 proposalBond;          // Bond amount for proposal
        uint256 disputePeriodEnd;      // When dispute period ends
    }

    /// @notice Mapping from market ID to resolution request
    mapping(bytes32 => ResolutionRequest) public requests;

    /// @notice Bond amount for proposing an outcome (0.1 ETH)
    uint256 public constant PROPOSAL_BOND = 0.1 ether;

    /// @notice Dispute period duration (1 day)
    uint256 public constant DISPUTE_PERIOD = 1 days;

    /// @notice Emitted when resolution is requested
    event ResolutionRequested(bytes32 indexed marketId, bytes32 umaQuestionId);

    /// @notice Emitted when an outcome is proposed
    event OutcomeProposed(bytes32 indexed marketId, uint256 outcome, address proposer);

    /// @notice Emitted when a proposal is disputed
    event ProposalDisputed(bytes32 indexed marketId, address disputer, string reason);

    /// @notice Emitted when resolution is finalized
    event ResolutionFinalized(bytes32 indexed marketId, uint256 winningOutcome);

    /**
     * @notice Request resolution for a market
     * @param marketId Market identifier
     * @param umaQuestionId UMA question identifier
     */
    function requestResolution(
        bytes32 marketId,
        bytes32 umaQuestionId
    ) external {
        ResolutionRequest storage request = requests[marketId];
        require(request.marketId == bytes32(0), "UMAOracle: Already requested");

        request.marketId = marketId;
        request.umaQuestionId = umaQuestionId;
        request.requestTime = block.timestamp;
        request.resolved = false;

        emit ResolutionRequested(marketId, umaQuestionId);
    }

    /**
     * @notice Propose an outcome for a market
     * @dev Must bond PROPOSAL_BOND which is returned if correct
     * @param marketId Market identifier
     * @param outcome Index of winning outcome
     */
    function proposeOutcome(
        bytes32 marketId,
        uint256 outcome
    ) external payable {
        ResolutionRequest storage request = requests[marketId];
        require(request.marketId != bytes32(0), "UMAOracle: Request not found");
        require(!request.resolved, "UMAOracle: Already resolved");
        require(msg.value >= PROPOSAL_BOND, "UMAOracle: Insufficient bond");

        request.proposer = msg.sender;
        request.winningOutcome = outcome;
        request.proposalBond = msg.value;
        request.disputePeriodEnd = block.timestamp + DISPUTE_PERIOD;

        emit OutcomeProposed(marketId, outcome, msg.sender);
    }

    /**
     * @notice Dispute a proposed outcome
     * @dev In production, this would trigger UMA's dispute process
     * @param marketId Market identifier
     * @param reason Reason for dispute
     */
    function disputeProposal(
        bytes32 marketId,
        string calldata reason
    ) external payable {
        ResolutionRequest storage request = requests[marketId];
        require(request.marketId != bytes32(0), "UMAOracle: Request not found");
        require(!request.resolved, "UMAOracle: Already resolved");
        require(block.timestamp < request.disputePeriodEnd, "UMAOracle: Dispute period ended");

        // In production, implement actual dispute logic with UMA
        // For MVP, we just emit an event
        emit ProposalDisputed(marketId, msg.sender, reason);
    }

    /**
     * @notice Finalize resolution after dispute period
     * @dev Can be called by anyone after dispute period ends
     * @param marketId Market identifier
     */
    function finalizeResolution(bytes32 marketId) external {
        ResolutionRequest storage request = requests[marketId];
        require(request.marketId != bytes32(0), "UMAOracle: Request not found");
        require(!request.resolved, "UMAOracle: Already resolved");
        require(block.timestamp >= request.disputePeriodEnd, "UMAOracle: Dispute period active");
        require(request.proposer != address(0), "UMAOracle: No proposal");

        request.resolved = true;

        // Return bond to proposer
        payable(request.proposer).transfer(request.proposalBond);

        emit ResolutionFinalized(marketId, request.winningOutcome);
    }

    /**
     * @notice Verify if a resolution is correct
     * @dev Used by PredictionMarketFactory to validate resolutions
     * @param marketId Market identifier
     * @param outcome Proposed winning outcome
     * @return True if outcome matches the finalized resolution
     */
    function verifyResolution(
        bytes32 marketId,
        uint256 outcome
    ) external view returns (bool) {
        ResolutionRequest storage request = requests[marketId];
        return request.resolved && request.winningOutcome == outcome;
    }

    /**
     * @notice Get resolution request details
     * @param marketId Market identifier
     * @return request The resolution request
     */
    function getResolutionRequest(bytes32 marketId) external view returns (ResolutionRequest memory) {
        return requests[marketId];
    }

    /**
     * @notice Admin function to set resolution directly (for testing)
     * @dev In production, this should be removed or strictly access-controlled
     * @param marketId Market identifier
     * @param outcome Winning outcome
     */
    function adminSetResolution(bytes32 marketId, uint256 outcome) external onlyOwner {
        ResolutionRequest storage request = requests[marketId];
        require(request.marketId != bytes32(0), "UMAOracle: Request not found");

        request.winningOutcome = outcome;
        request.resolved = true;

        emit ResolutionFinalized(marketId, outcome);
    }

    /**
     * @notice Withdraw contract balance (e.g., disputed bonds)
     * @dev Only owner can withdraw
     * @param to Address to send funds to
     * @param amount Amount to withdraw
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "UMAOracle: Insufficient balance");
        to.transfer(amount);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
