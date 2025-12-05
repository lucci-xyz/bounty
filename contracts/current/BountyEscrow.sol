// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts@5.0.2/token/ERC20/extensions/IERC20Metadata.sol";
import {Address} from "@openzeppelin/contracts@5.0.2/utils/Address.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable@5.0.2/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable@5.0.2/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable@5.0.2/utils/PausableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable@5.0.2/access/OwnableUpgradeable.sol";

/**
 * @title BountyEscrow
 * @notice Upgradeable escrow for GitHub issue bounties with an allowlist of ERC20 stablecoins.
 *
 * - Each bounty has a token (USDC, DAI, USDT, etc.) from an owner-controlled allowlist.
 * - `amount` is always the net bounty: what the claimer will receive.
 * - Sponsor pays `amount + fee` at create/fund time; fee is taken upfront.
 * - Claimer receives full `amount` at resolve; fee is not taken again.
 * - Owner can change `feeBps` (within MAX_FEE_BPS), pause, and withdraw protocol fees.
 *
 * Time rules:
 * - Before or at deadline (block.timestamp <= deadline): resolver can resolve.
 * - After deadline (block.timestamp > deadline): sponsor can refund via refundExpired.
 * - There is NO cancel function; funds are locked until either resolution or post-deadline refund.
 *
 * Deploy behind a proxy and call `initialize(...)` once.
 */
contract BountyEscrow is
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;

    /// @notice Maximum protocol fee in basis points (1_000 = 10%).
    uint16 public constant MAX_FEE_BPS = 1_000;

    /// @dev Basis point denominator (10_000 = 100%).
    uint256 private constant FEE_DENOM = 10_000;

    enum Status {
        None,
        Open,
        Resolved,
        Refunded
    }

    struct Bounty {
        bytes32 repoIdHash;
        address sponsor;
        address resolver;
        address token;   // ERC20 token used for this bounty
        uint96 amount;   // net bounty amount (what the recipient will receive)
        uint64 deadline;
        uint64 issueNumber;
        Status status;
    }

    // -------- Storage --------

    /// @dev Primary token (for backwards compatibility with the old USDC-only interface).
    IERC20 private _primaryToken;
    uint8 private _primaryTokenDecimals;

    /// @dev Allowlist of ERC20 tokens that can be used for bounties.
    mapping(address => bool) public allowedTokens;

    /// @dev BountyId (keccak256(sponsor, repoIdHash, issueNumber)) → Bounty.
    mapping(bytes32 => Bounty) private _bounties;

    /// @notice Protocol fee in basis points (out of 10_000).
    uint16 public feeBps;

    /// @notice Total net amount currently locked in active bounties, per token.
    mapping(address => uint256) public totalEscrowedByToken;

    /// @notice Cumulative fees accrued over the lifetime of the contract (informational only).
    uint256 public totalFeesAccrued;

    // Storage gap for future upgrades.
    uint256[44] private __gap;

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

    event Refunded(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 amount
    );

    event FeeBpsUpdated(uint16 feeBps);

    event AllowedTokenUpdated(address indexed token, bool allowed);

    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);

    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    event NativeDeposited(address indexed from, uint256 amount);

    event NativeSwept(address indexed to, uint256 amount);

    // -------- Errors --------

    error InvalidParams();
    error AlreadyExists();
    error NotOpen();
    error NotSponsor();
    error NotResolver();
    error DeadlineNotReached(); // used when someone tries to refund before deadline
    error DeadlinePassed();     // used when someone tries to resolve after deadline
    error ZeroAddress();
    error ZeroAmount();
    error NoFeesAvailable();
    error InsufficientFees();
    error TokenNotAllowed();
    error CannotRescueAllowedToken();

    // -------- Initializer (for proxy) --------

    /**
     * @param primaryToken_ Primary ERC20 token (e.g., USDC) used for bounties
     *                      when calling the legacy `createBounty` entrypoint.
     *                      Must be part of the allowlist.
     * @param _feeBps       Initial protocol fee in basis points (≤ MAX_FEE_BPS).
     * @param initialOwner  Contract owner (admin for pause/fees/withdraw).
     */
    function initialize(
        address primaryToken_,
        uint16 _feeBps,
        address initialOwner
    ) external initializer {
        if (primaryToken_ == address(0) || initialOwner == address(0)) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();

        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(initialOwner);

        // Set primary token and its decimals (for UI compatibility).
        _primaryToken = IERC20(primaryToken_);
        uint8 dec;
        try IERC20Metadata(primaryToken_).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            dec = 6; // reasonable default for stables
        }
        _primaryTokenDecimals = dec;

        // Allowlist primary token by default.
        allowedTokens[primaryToken_] = true;
        emit AllowedTokenUpdated(primaryToken_, true);

        feeBps = _feeBps;
    }

    // -------- View Utilities --------

    /**
     * @notice Compute a bounty id from sponsor/repo/issue.
     */
    function computeBountyId(
        address sponsor,
        bytes32 repoIdHash,
        uint64 issueNumber
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(sponsor, repoIdHash, issueNumber));
    }

    /**
     * @notice Legacy: returns the primary token address (was USDC).
     */
    function usdc() external view returns (address) {
        return address(_primaryToken);
    }

    /**
     * @notice Legacy: returns decimals for the primary token.
     */
    function usdcDecimals() external view returns (uint8) {
        return _primaryTokenDecimals;
    }

    /**
     * @notice Primary token getter (same as `usdc()`).
     */
    function primaryToken() external view returns (address) {
        return address(_primaryToken);
    }

    /**
     * @notice Get a bounty by id.
     */
    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return _bounties[bountyId];
    }

    // -------- Admin: Pause / Fees / Tokens --------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update the protocol fee (bps).
     */
    function setFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidParams();
        feeBps = _feeBps;
        emit FeeBpsUpdated(_feeBps);
    }

    /**
     * @notice Add or remove an allowed bounty token.
     * @dev You should NOT remove a token that still has non-zero `totalEscrowedByToken[token]`.
     */
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!allowed && totalEscrowedByToken[token] != 0) revert InvalidParams();

        allowedTokens[token] = allowed;
        emit AllowedTokenUpdated(token, allowed);
    }

    // -------- Core Flows --------

    /**
     * @notice Create and fund a new bounty using the primary token.
     * @dev `amount` is the net bounty: what the claimer will receive if resolved.
     *      Sponsor pays `amount + fee` where `fee = amount * feeBps / 10_000`.
     *      For explicit token choice, use `createBountyWithToken`.
     */
    function createBounty(
        address resolver,
        bytes32 repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32 bountyId) {
        bountyId = _createBounty(
            address(_primaryToken),
            resolver,
            repoIdHash,
            issueNumber,
            deadline,
            amount
        );
    }

    /**
     * @notice Create and fund a new bounty specifying a token from the allowlist.
     * @dev `amount` is the net bounty: what the claimer will receive if resolved.
     */
    function createBountyWithToken(
        address token,
        address resolver,
        bytes32 repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32 bountyId) {
        bountyId = _createBounty(
            token,
            resolver,
            repoIdHash,
            issueNumber,
            deadline,
            amount
        );
    }

    function _createBounty(
        address token,
        address resolver,
        bytes32 repoIdHash,
        uint64 issueNumber,
        uint64 deadline,
        uint256 amount
    ) internal returns (bytes32 bountyId) {
        if (!allowedTokens[token]) revert TokenNotAllowed();
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
        b.token = token;
        b.amount = uint96(amount);
        b.deadline = deadline;
        b.issueNumber = issueNumber;
        b.status = Status.Open;

        uint256 fee = (amount * feeBps) / FEE_DENOM;
        uint256 total = amount + fee;

        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        totalEscrowedByToken[token] += amount;
        if (fee > 0) {
            totalFeesAccrued += fee;
        }

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
     * @notice Add more funds (net bounty) to an existing bounty.
     * @dev Sponsor pays `amount + fee`. Token is taken from the existing bounty.
     */
    function fund(
        bytes32 bountyId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();
        if (amount == 0) revert ZeroAmount();

        uint256 newTotal = uint256(b.amount) + amount;
        if (newTotal > type(uint96).max) revert InvalidParams();

        address token = b.token;
        if (!allowedTokens[token]) revert TokenNotAllowed();

        uint256 fee = (amount * feeBps) / FEE_DENOM;
        uint256 total = amount + fee;

        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        b.amount = uint96(newTotal);
        totalEscrowedByToken[token] += amount;
        if (fee > 0) {
            totalFeesAccrued += fee;
        }

        emit Funded(bountyId, newTotal);
    }

    /**
     * @notice Resolve an open bounty to a recipient.
     * @dev Pays the full stored bounty amount to the recipient; fee was charged at funding.
     *      Allowed while block.timestamp <= deadline.
     */
    function resolve(
        bytes32 bountyId,
        address recipient
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();

        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.resolver) revert NotResolver();

        // Disallow resolving after the deadline (strictly greater than).
        if (block.timestamp > b.deadline) revert DeadlinePassed();

        b.status = Status.Resolved;

        uint256 amount_ = b.amount;
        address token = b.token;
        b.amount = 0;

        if (amount_ > 0) {
            totalEscrowedByToken[token] -= amount_;
            IERC20(token).safeTransfer(recipient, amount_);
        }

        // For compatibility with off-chain consumers: net=amount_, fee=0 here.
        emit Resolved(bountyId, recipient, amount_, 0);
    }

    /**
     * @notice Refund an expired bounty after the deadline has passed.
     * @dev Only sponsor can refund; returns net bounty only (fee stays as protocol revenue).
     *      Allowed only when block.timestamp > deadline.
     */
    function refundExpired(
        bytes32 bountyId
    ) external nonReentrant whenNotPaused {
        Bounty storage b = _bounties[bountyId];
        if (b.status != Status.Open) revert NotOpen();
        if (msg.sender != b.sponsor) revert NotSponsor();

        // Only allow refund after the deadline has fully passed.
        if (block.timestamp <= b.deadline) revert DeadlineNotReached();

        b.status = Status.Refunded;
        uint256 amount_ = b.amount;
        address token = b.token;
        b.amount = 0;

        if (amount_ > 0) {
            totalEscrowedByToken[token] -= amount_;
            IERC20(token).safeTransfer(b.sponsor, amount_);
        }

        emit Refunded(bountyId, b.sponsor, amount_);
    }

    // -------- Fees & Vault Logic --------

    /**
     * @notice Returns the amount of a given token currently available as protocol fees.
     * @dev Computed as token balance - totalEscrowedByToken[token].
     */
    function availableFees(address token) public view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 escrowed = totalEscrowedByToken[token];
        if (balance <= escrowed) {
            return 0;
        }
        return balance - escrowed;
    }

    /**
     * @notice Withdraw accumulated protocol fees for a specific token.
     * @dev Only owner. Cannot withdraw escrowed funds.
     *
     * @param token  ERC20 token to withdraw fees in (must be an allowed token).
     * @param to     Recipient address.
     * @param amount Amount to withdraw. If 0, withdraws full availableFees(token).
     */
    function withdrawFees(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (!allowedTokens[token]) revert TokenNotAllowed();

        uint256 available = availableFees(token);
        if (available == 0) revert NoFeesAvailable();

        if (amount == 0) {
            amount = available;
        } else {
            if (amount > available) revert InsufficientFees();
        }

        IERC20(token).safeTransfer(to, amount);
        emit FeesWithdrawn(token, to, amount);
    }

    /**
     * @notice Rescue arbitrary ERC-20 tokens that are NOT used for bounties.
     * @dev Only owner. Cannot be used for currently allowed bounty tokens.
     */
    function rescueToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (allowedTokens[token]) revert CannotRescueAllowedToken();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    /**
     * @notice Sweep any native ETH held by this contract.
     * @dev Only owner. Does not affect ERC20 balances.
     */
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