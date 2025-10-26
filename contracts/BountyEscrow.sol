// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts@5.0.2/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts@5.0.2/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeCast} from "@openzeppelin/contracts@5.0.2/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin/contracts@5.0.2/utils/math/Math.sol";

/**
 * @title BountyEscrow
 * @notice Minimal, USDC-based escrow for GitHub issue bounties.
 *         Sponsor funds a bounty; a designated resolver can settle to a recipient before the deadline;
 *         sponsors can cancel or refund after deadline. Owner sets fee params and can pause.
 *
 * @dev Design:
 * - Token: single ERC-20 (intended USDC). Address immutable. Decimals cached (best-effort, fallback=6).
 * - State machine per-bounty: None → Open → (Resolved | Refunded | Canceled). Terminal states are final.
 * - Funds held in-contract; payouts are pull-style via resolver/sponsor actions.
 * - Fee assessed only on successful resolution; transfers: recipient (net) + feeVault (fee).
 * - Reentrancy: public state-changing entrypoints are nonReentrant; CEI respected.
 * - Pausability: owner can pause/unpause all state-changing flows.
 *
 * @custom:security
 * - Resolver authority is scoped per bounty; cannot change post-creation.
 * - Sponsor is the caller that created the bounty; only sponsor can top-up/cancel/refund.
 * - No arbitrary token transfers; only the configured _usdc is handled.
 * - Fee bounded by MAX_FEE_BPS (10%).
 *
 * @custom:oz-version
 * - OpenZeppelin 5.0.2 (imports pinned via versioned paths).
 */
contract BountyEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    /// @notice Maximum protocol fee in basis points (1_000 = 10%).
    uint16 public constant MAX_FEE_BPS = 1_000;

    /// @dev Basis point denominator (10_000 = 100%).
    uint256 private constant FEE_DENOM = 10_000;

    /**
     * @notice Lifecycle status of a bounty.
     * @dev Transitions:
     * - None (default) → Open (on createBounty)
     * - Open → Resolved (resolver calls resolve)
     * - Open → Refunded (sponsor calls refundExpired after deadline)
     * - Open → Canceled (sponsor calls cancel before deadline)
     * Terminal states: Resolved, Refunded, Canceled.
     */
    enum Status {
        None,
        Open,
        Resolved,
        Refunded,
        Canceled
    }

    /**
     * @notice Bounty storage layout.
     * @param repoIdHash Hash of repository identity (e.g., chain-agnostic slug hash).
     * @param sponsor EOA/contract that funded the bounty; only sponsor can top-up/cancel/refund.
     * @param resolver Address authorized to resolve this bounty to a recipient.
     * @param amount Current escrowed amount (USDC units).
     * @param deadline Unix timestamp; after this, sponsor may refund if still Open.
     * @param issueNumber GitHub issue number (or equivalent reference).
     * @param status Lifecycle state (see Status enum).
     */
    struct Bounty {
        bytes32 repoIdHash;
        address sponsor;
        address resolver;
        uint96 amount;
        uint64 deadline;
        uint64 issueNumber;
        Status status;
    }

    // -------- Storage --------

    /// @dev Immutable reference to the ERC-20 used for all transfers (intended USDC).
    IERC20 private immutable _usdc;

    /// @dev Cached decimals for display/UX; logic does not assume a specific precision.
    uint8 private immutable _usdcDecimals;

    /// @dev BountyId (keccak256(sponsor, repoIdHash, issueNumber)) → Bounty.
    mapping(bytes32 => Bounty) private _bounties;

    /// @notice Protocol fee in basis points (out of 10_000).
    uint16 public feeBps;

    /// @notice Address that receives protocol fees upon resolution.
    address public feeVault;

    // -------- Events --------

    /**
     * @notice Emitted when a bounty is created and funded.
     * @param bountyId Deterministic id: keccak256(sponsor, repoIdHash, issueNumber).
     * @param sponsor Bounty sponsor (msg.sender of createBounty).
     * @param repoIdHash Repository identifier hash associated with the issue.
     * @param issueNumber Issue number within the repository.
     * @param deadline Expiration timestamp for refund eligibility.
     * @param resolver Address authorized to resolve this bounty.
     * @param amount Initial funded amount (USDC units).
     */
    event BountyCreated(
        bytes32 indexed bountyId,
        address indexed sponsor,
        bytes32 indexed repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        address resolver,
        uint256 amount
    );

    /**
     * @notice Emitted when the sponsor tops up an existing Open bounty.
     * @param bountyId Id of the bounty funded.
     * @param newAmount New total escrowed amount after top-up.
     */
    event Funded(bytes32 indexed bountyId, uint256 newAmount);

    /**
     * @notice Emitted on successful resolution and payout.
     * @param bountyId Id of the bounty.
     * @param recipient Address receiving the net payout.
     * @param net Amount sent to recipient (gross - fee).
     * @param fee Amount sent to feeVault.
     */
    event Resolved(
        bytes32 indexed bountyId,
        address indexed recipient,
        uint256 net,
        uint256 fee
    );

    /**
     * @notice Emitted when an expired Open bounty is refunded to the sponsor.
     * @param bountyId Id of the bounty.
     * @param sponsor Sponsor receiving the refund.
     * @param amount Amount refunded.
     */
    event Refunded(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 amount
    );

    /**
     * @notice Emitted when an Open bounty is canceled by the sponsor before deadline.
     * @param bountyId Id of the bounty.
     * @param sponsor Sponsor receiving the returned funds.
     * @param amount Amount returned.
     */
    event Canceled(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 amount
    );

    /**
     * @notice Emitted when fee parameters are updated by owner.
     * @param feeBps New fee in basis points.
     * @param feeVault Address to receive fees.
     */
    event FeeParamsUpdated(uint16 feeBps, address feeVault);

    // -------- Errors --------

    /// @notice Thrown when parameters fail validation (range/overflow/state).
    error InvalidParams();

    /// @notice Thrown when attempting to create a bounty that already exists.
    error AlreadyExists();

    /// @notice Thrown when action requires an Open bounty but it is not Open.
    error NotOpen();

    /// @notice Thrown when caller is not the bounty sponsor.
    error NotSponsor();

    /// @notice Thrown when caller is not the designated resolver.
    error NotResolver();

    /// @notice Thrown when refund attempted before deadline.
    error DeadlineNotReached();

    /// @notice Thrown when an address argument is zero.
    error ZeroAddress();

    /// @notice Thrown when an amount argument is zero.
    error ZeroAmount();

    // -------- Constructor --------

    /**
     * @param usdc_ ERC-20 token address used for all escrowed transfers (intended USDC).
     * @param _feeBps Initial protocol fee in basis points (≤ MAX_FEE_BPS).
     * @param _feeVault Address to receive protocol fees on resolution.
     * @param initialOwner Contract owner (admin for pause/fee params).
     */
    constructor(
        address usdc_,
        uint16 _feeBps,
        address _feeVault,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            usdc_ == address(0) ||
            _feeVault == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();

        _usdc = IERC20(usdc_);

        // Cache token decimals; if token does not implement IERC20Metadata, default to 6 (typical USDC).
        uint8 dec;
        try IERC20Metadata(usdc_).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            dec = 6;
        }
        _usdcDecimals = dec;

        feeBps = _feeBps;
        feeVault = _feeVault;
    }

    // -------- Pure / View Utilities --------

    /**
     * @notice Compute the deterministic bounty id.
     * @dev Establishes a one-bounty-per (sponsor, repoIdHash, issueNumber) invariant.
     * @param sponsor Address of the sponsor (creator/funder).
     * @param repoIdHash Repository identifier hash.
     * @param issueNumber Issue number reference.
     * @return bountyId keccak256(sponsor, repoIdHash, issueNumber).
     */
    function computeBountyId(
        address sponsor,
        bytes32 repoIdHash,
        uint64 issueNumber
    ) public pure returns (bytes32 bountyId) {
        return keccak256(abi.encodePacked(sponsor, repoIdHash, issueNumber));
    }

    // -------- Admin --------

    /**
     * @notice Pause all state-changing functions.
     * @dev Only owner. Idempotent via OZ Pausable.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause all state-changing functions.
     * @dev Only owner. Idempotent via OZ Pausable.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update protocol fee and fee vault address.
     * @dev Only owner. Fee bounded by MAX_FEE_BPS. feeVault must be non-zero.
     * @param _feeBps New fee in basis points.
     * @param _feeVault New fee receiver address.
     */
    function setFeeParams(
        uint16 _feeBps,
        address _feeVault
    ) external onlyOwner {
        if (_feeVault == address(0)) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();
        feeBps = _feeBps;
        feeVault = _feeVault;
        emit FeeParamsUpdated(_feeBps, _feeVault);
    }

    // -------- Core Flows --------

    /**
     * @notice Create a new bounty and fund it in a single transaction.
     * @dev Requirements:
     * - resolver != 0
     * - repoIdHash != 0 and issueNumber != 0
     * - deadline > now
     * - amount > 0
     * - bountyId (sponsor, repoIdHash, issueNumber) must not already exist
     * Effects:
     * - Initializes Bounty struct with Status.Open
     * - Transfers `amount` of _usdc from msg.sender to this contract
     * @param resolver Address allowed to resolve this bounty.
     * @param repoIdHash Repository identifier hash.
     * @param issueNumber Issue number within the repository.
     * @param deadline Timestamp after which sponsor can refund if still Open.
     * @param amount Amount to escrow (USDC units).
     * @return bountyId Deterministic id for the created bounty.
     */
    function createBounty(
        address resolver,
        bytes32 repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32 bountyId) {
        if (resolver == address(0)) revert ZeroAddress();
        if (repoIdHash == bytes32(0) || issueNumber == 0)
            revert InvalidParams();
        if (deadline <= block.timestamp) revert InvalidParams();
        if (amount == 0) revert ZeroAmount();

        bountyId = computeBountyId(msg.sender, repoIdHash, issueNumber);
        if (_bounties[bountyId].status != Status.None) revert AlreadyExists();

        Bounty storage b = _bounties[bountyId];
        b.repoIdHash = repoIdHash;
        b.sponsor = msg.sender;
        b.resolver = resolver;
        b.amount = amount.toUint96(); // downcast after additive overflow checks elsewhere
        b.deadline = deadline;
        b.issueNumber = issueNumber;
        b.status = Status.Open;

        _usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit BountyCreated(
            bountyId,
            msg.sender,
            repoIdHash,
            issueNumber,
            deadline,
            resolver,
            amount
        );
    }

    /**
     * @notice Top up an existing Open bounty.
     * @dev Only the sponsor can fund. Amount must be > 0. Status must be Open.
     *      Emits the new total escrowed amount for auditability.
     * @param bountyId Target bounty.
     * @param amount Additional amount to escrow.
     */
    function fund(
        bytes32 bountyId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();
        if (amount == 0) revert ZeroAmount();

        // Prevent uint96 overflow post-top-up.
        uint256 newAmt = uint256(b.amount) + amount;
        if (newAmt > type(uint96).max) revert InvalidParams();
        b.amount = newAmt.toUint96();

        _usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit Funded(bountyId, newAmt);
    }

    /**
     * @notice Cancel an Open bounty before the deadline and retrieve funds.
     * @dev Only sponsor; bounty must be Open. Sets status to Canceled and returns all funds.
     * @param bountyId Target bounty.
     */
    function cancel(bytes32 bountyId) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();

        b.status = Status.Canceled;
        uint256 gross = b.amount;
        b.amount = 0;

        if (gross > 0) _usdc.safeTransfer(b.sponsor, gross);
        emit Canceled(bountyId, b.sponsor, gross);
    }

    /**
     * @notice Resolve an Open bounty to a recipient, paying out net amount and fee.
     * @dev Only the designated resolver; recipient must be non-zero.
     *      Fee = floor(gross * feeBps / 10_000); Net = gross - fee.
     *      Uses Math.mulDiv for precise, overflow-safe multiplication/division.
     * @param bountyId Target bounty.
     * @param recipient Address receiving the net payout.
     */
    function resolve(
        bytes32 bountyId,
        address recipient
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();

        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.resolver) revert NotResolver();

        b.status = Status.Resolved;
        uint256 gross = b.amount;
        b.amount = 0;

        // Compute fee and net with overflow-safe mulDiv.
        uint256 fee = Math.mulDiv(gross, feeBps, FEE_DENOM);
        uint256 net = gross - fee;

        if (net > 0) _usdc.safeTransfer(recipient, net);
        if (fee > 0) _usdc.safeTransfer(feeVault, fee);

        emit Resolved(bountyId, recipient, net, fee);
    }

    /**
     * @notice Refund an Open bounty after the deadline back to the sponsor.
     * @dev Only sponsor; requires block.timestamp ≥ deadline.
     *      Sets status to Refunded and returns all funds.
     * @param bountyId Target bounty.
     */
    function refundExpired(
        bytes32 bountyId
    ) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (block.timestamp < b.deadline) revert DeadlineNotReached();
        if (msg.sender != b.sponsor) revert NotSponsor();

        b.status = Status.Refunded;
        uint256 gross = b.amount;
        b.amount = 0;

        if (gross > 0) _usdc.safeTransfer(b.sponsor, gross);
        emit Refunded(bountyId, b.sponsor, gross);
    }

    // -------- Explicit Getters --------

    /**
     * @notice ERC-20 token used for escrow (intended USDC).
     */
    function usdc() external view returns (IERC20) {
        return _usdc;
    }

    /**
     * @notice Cached decimals of the escrow token (best-effort; default 6).
     */
    function usdcDecimals() external view returns (uint8) {
        return _usdcDecimals;
    }

    /**
     * @notice Read the full Bounty struct for a given id.
     * @dev Returns a memory copy; safe for off-chain indexing/UX.
     * @param bountyId Bounty id to query.
     */
    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return _bounties[bountyId];
    }
}
