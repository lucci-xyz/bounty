// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts@5.0.2/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts@5.0.2/token/ERC20/extensions/IERC20Metadata.sol";
import {Address} from "@openzeppelin/contracts@5.0.2/utils/Address.sol";

/**
 * @title BountyEscrow
 * @notice USDC-based escrow for GitHub issue bounties with integrated fee vault.
 *
 *         Sponsor funds a bounty; a designated resolver can settle to a recipient before the deadline;
 *         sponsors can cancel or refund after deadline. Owner sets fee params, can pause,
 *         and can withdraw only protocol fees (not active escrow).
 */
contract BountyEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Maximum protocol fee in basis points (1_000 = 10%).
    uint16 public constant MAX_FEE_BPS = 1_000;

    /// @dev Basis point denominator (10_000 = 100%).
    uint256 private constant FEE_DENOM = 10_000;

    enum Status {
        None,
        Open,
        Resolved,
        Refunded,
        Canceled
    }

    struct Bounty {
        bytes32 repoIdHash;
        address sponsor;
        address resolver;
        uint96 amount;      // gross escrowed amount
        uint64 deadline;
        uint64 issueNumber;
        Status status;
    }

    // -------- Storage --------

    IERC20 private immutable _usdc;
    uint8 private immutable _usdcDecimals;

    /// @dev BountyId (keccak256(sponsor, repoIdHash, issueNumber)) → Bounty.
    mapping(bytes32 => Bounty) private _bounties;

    /// @notice Protocol fee in basis points (out of 10_000).
    uint16 public feeBps;

    /// @notice Total gross amount currently locked in active (Open) bounties.
    uint256 public totalEscrowed;

    /// @notice Cumulative fees accrued over the lifetime of the contract (informational).
    uint256 public totalFeesAccrued;

    // -------- Events --------

    event BountyCreated(
        bytes32 indexed bountyId,
        address indexed sponsor,
        bytes32 indexed repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        address resolver,
        uint256 amount
    );

    event Funded(bytes32 indexed bountyId, uint256 newAmount);

    event Resolved(
        bytes32 indexed bountyId,
        address indexed recipient,
        uint256 net,
        uint256 fee
    );

    event Canceled(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 amount
    );

    event Refunded(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 amount
    );

    event FeeBpsUpdated(uint16 feeBps);

    event FeesWithdrawn(address indexed to, uint256 amount);

    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    event NativeDeposited(address indexed from, uint256 amount);

    event NativeSwept(address indexed to, uint256 amount);

    // -------- Errors --------

    error InvalidParams();
    error AlreadyExists();
    error NotOpen();
    error NotSponsor();
    error NotResolver();
    error DeadlineNotReached();
    error ZeroAddress();
    error ZeroAmount();
    error NoFeesAvailable();
    error InsufficientFees();
    error CannotRescueUsdc();

    // -------- Constructor --------

    /**
     * @param usdc_ ERC-20 token address used for all escrowed transfers (intended USDC).
     * @param _feeBps Initial protocol fee in basis points (≤ MAX_FEE_BPS).
     * @param initialOwner Contract owner (admin for pause/fees/withdraw).
     */
    constructor(
        address usdc_,
        uint16 _feeBps,
        address initialOwner
    ) Ownable(initialOwner) {
        if (usdc_ == address(0) || initialOwner == address(0)) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();

        _usdc = IERC20(usdc_);

        uint8 dec;
        try IERC20Metadata(usdc_).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            dec = 6;
        }
        _usdcDecimals = dec;

        feeBps = _feeBps;
    }

    // -------- Pure / View Utilities --------

    function computeBountyId(
        address sponsor,
        bytes32 repoIdHash,
        uint64 issueNumber
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(sponsor, repoIdHash, issueNumber));
    }

    function usdc() external view returns (address) {
        return address(_usdc);
    }

    function usdcDecimals() external view returns (uint8) {
        return _usdcDecimals;
    }

    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return _bounties[bountyId];
    }

    // -------- Admin: Pause / Fees --------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();
        feeBps = _feeBps;
        emit FeeBpsUpdated(_feeBps);
    }

    // -------- Core Flows --------

    function createBounty(
        address resolver,
        bytes32 repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32 bountyId) {
        if (resolver == address(0)) revert ZeroAddress();
        if (repoIdHash == bytes32(0) || issueNumber == 0) revert InvalidParams();
        if (deadline <= block.timestamp) revert InvalidParams();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint96).max) revert InvalidParams();

        bountyId = computeBountyId(msg.sender, repoIdHash, issueNumber);
        if (_bounties[bountyId].status != Status.None) revert AlreadyExists();

        Bounty storage b = _bounties[bountyId];
        b.repoIdHash = repoIdHash;
        b.sponsor = msg.sender;
        b.resolver = resolver;
        b.amount = uint96(amount);
        b.deadline = deadline;
        b.issueNumber = issueNumber;
        b.status = Status.Open;

        totalEscrowed += amount;

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

    function fund(
        bytes32 bountyId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();
        if (amount == 0) revert ZeroAmount();

        uint256 newAmt = uint256(b.amount) + amount;
        if (newAmt > type(uint96).max) revert InvalidParams();
        b.amount = uint96(newAmt);

        totalEscrowed += amount;

        _usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit Funded(bountyId, newAmt);
    }

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

        if (gross > 0) {
            totalEscrowed -= gross;
        }

        // Safe from overflow: gross ≤ 2^96, feeBps ≤ 1_000.
        uint256 fee = (gross * feeBps) / FEE_DENOM;
        uint256 net = gross - fee;

        if (net > 0) {
            _usdc.safeTransfer(recipient, net);
        }
        if (fee > 0) {
            totalFeesAccrued += fee;
        }

        emit Resolved(bountyId, recipient, net, fee);
    }

    function cancel(bytes32 bountyId) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();

        b.status = Status.Canceled;
        uint256 gross = b.amount;
        b.amount = 0;

        if (gross > 0) {
            totalEscrowed -= gross;
            _usdc.safeTransfer(b.sponsor, gross);
        }

        emit Canceled(bountyId, b.sponsor, gross);
    }

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

        if (gross > 0) {
            totalEscrowed -= gross;
            _usdc.safeTransfer(b.sponsor, gross);
        }

        emit Refunded(bountyId, b.sponsor, gross);
    }

    // -------- Fees & Vault Logic (Integrated) --------

    /**
     * @notice Returns the amount of USDC currently available as protocol fees.
     * @dev Computed as contract USDC balance - totalEscrowed.
     */
    function availableFees() public view returns (uint256) {
        uint256 balance = _usdc.balanceOf(address(this));
        if (balance <= totalEscrowed) {
            return 0;
        }
        return balance - totalEscrowed;
    }

    /**
     * @notice Withdraw accumulated protocol fees in USDC.
     * @dev Only owner. Cannot withdraw escrowed funds.
     *      This is allowed even while the contract is paused.
     *
     * @param to Recipient address.
     * @param amount Amount to withdraw. If 0, withdraws full availableFees().
     */
    function withdrawFees(
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 available = availableFees();
        if (available == 0) revert NoFeesAvailable();

        if (amount == 0) {
            amount = available;
        } else if (amount > available) {
            revert InsufficientFees();
        }

        _usdc.safeTransfer(to, amount);
        emit FeesWithdrawn(to, amount);
    }

    /**
     * @notice Rescue arbitrary ERC-20 tokens (non-USDC) accidentally sent to this contract.
     * @dev Only owner. Cannot be used for the primary USDC token.
     */
    function rescueToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (token == address(_usdc)) revert CannotRescueUsdc();

        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    // -------- Native ETH Handling (Optional Vault-Style) --------

    function sweepNative(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) revert ZeroAmount();

        Address.sendValue(payable(to), bal);
        emit NativeSwept(to, bal);
    }

    receive() external payable {
        emit NativeDeposited(msg.sender, msg.value);
    }
}
