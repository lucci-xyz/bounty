// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts@5.0.2/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title BountyEscrowProxy
 * @notice Transparent upgradeable proxy for the BountyEscrow implementation.
 *
 * - `logic`  = BountyEscrow implementation address
 * - `admin`  = account that can upgrade the proxy (your upgrade admin / owner)
 * - `data`   = encoded call to BountyEscrow.initialize(...)
 *
 * Frontend, bots, and scripts MUST use this proxy address, not the implementation.
 */
contract BountyEscrowProxy is TransparentUpgradeableProxy {
    constructor(
        address logic,
        address admin,
        bytes memory data
    ) TransparentUpgradeableProxy(logic, admin, data) {}
}