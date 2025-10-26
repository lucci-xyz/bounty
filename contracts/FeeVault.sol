// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeVault
 * @notice Minimal owner-controlled vault for custodying and sweeping protocol fees
 *         in ERC-20 tokens and native ETH.
 *
 * @dev Intent:
 * - Single-owner, pull-style transfers only; no third-party withdrawals.
 * - No loops, no unbounded iteration; constant-time operations.
 * - Uses SafeERC20 for token safety and Address.sendValue for ETH safety.
 *
 * Trust/Threat model:
 * - Owner can transfer out any ERC-20 or all ETH. Treat the owner as having full custody.
 * - Contract does not assume a specific ERC-20 (generic vault), nor token decimals.
 *
 * Reentrancy:
 * - State is only reads + emits; still guarded with nonReentrant for defense-in-depth.
 *
 * Pausing/Upgradability:
 * - None. Simple, immutable logic. If you need pausability or role separation,
 *   deploy a new vault and rotate fee receivers at the protocol level.
 *
 * @custom:security
 * - Ensure the owner is a secure EOA/multisig.
 * - This contract holds funds; rotation of ownership should be controlled and audited.
 */
contract FeeVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------- Events --------------------

    /**
     * @notice Emitted after a successful ERC-20 token withdrawal.
     * @param token ERC-20 token address transferred out.
     * @param to Recipient of the transfer.
     * @param amount Amount transferred (token base units).
     */
    event Withdraw(address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Emitted when native ETH is received via the receive() function.
     * @param from Sender of ETH.
     * @param amount Amount of ETH received (wei).
     */
    event DepositNative(address indexed from, uint256 amount);

    /**
     * @notice Emitted after a successful sweep of all native ETH.
     * @param to Recipient of the sweep.
     * @param amount Amount of ETH swept (wei).
     */
    event SweepNative(address indexed to, uint256 amount);

    // -------------------- Errors --------------------

    /// @notice Thrown when an address argument is the zero address.
    error ZeroAddress();

    /// @notice Thrown when an amount is zero but must be > 0.
    error ZeroAmount();

    // -------------------- Construction --------------------

    /**
     * @param initialOwner Address that becomes the owner with full withdrawal rights.
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
    }

    // -------------------- ERC-20 Flow --------------------

    /**
     * @notice Withdraw a specific `amount` of ERC-20 `token` to `to`.
     * @dev Only callable by the owner.
     * - Uses SafeERC20.safeTransfer to handle non-standard ERC-20s.
     * - No token allowlist; this is a generic vault.
     * - Emits {Withdraw}.
     * @param token ERC-20 token address (must be non-zero).
     * @param to Recipient address (must be non-zero).
     * @param amount Amount to transfer (token base units, must be > 0).
     */
    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, amount);
        emit Withdraw(token, to, amount);
    }

    // -------------------- Native ETH Flow --------------------

    /**
     * @notice Sweep the entire native ETH balance to `to`.
     * @dev Only callable by the owner.
     * - Uses Address.sendValue which forwards all gas and reverts on failure.
     * - Reverts if vault balance is zero to prevent no-op calls.
     * - Emits {SweepNative}.
     * @param to Recipient of the sweep (must be non-zero).
     */
    function sweepNative(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) revert ZeroAmount();

        // Safer than raw call; reverts on failure and avoids silent partial sends.
        Address.sendValue(to, bal);
        emit SweepNative(to, bal);
    }

    /**
     * @notice Accept native ETH (e.g., protocol fee hooks or manual sends).
     * @dev Emits {DepositNative} for traceability; no logic beyond logging.
     */
    receive() external payable {
        emit DepositNative(msg.sender, msg.value);
    }
}
