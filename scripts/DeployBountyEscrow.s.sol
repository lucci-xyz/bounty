// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BountyEscrow} from "@/contracts/current/BountyEscrow.sol";
import {BountyEscrowProxy} from "@/contracts/proxy/BountyEscrowProxy.sol";

/**
 * Deploys the upgradeable BountyEscrow + proxy.
 *
 * - Deploy implementation (no constructor)
 * - Deploy Transparent Proxy pointing to implementation
 * - Initialize via proxy with:
 *     primaryToken = Base Sepolia USDC
 *     feeBps      = 100 (1%)
 *     owner/admin = EOA from OWNER_PK_BASE_SEPOLIA
 *
 * NOTE: Protocol fees are withdrawn later via
 *       withdrawFees(token, TREASURY_BASE_SEPOLIA, amount)
 */
contract DeployBountyEscrow is Script {
    address internal constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    uint16 internal constant FEE_BPS = 100;

    function run() external returns (address implementation, address proxy) {
        return deployBaseSepolia();
    }

    function deployBaseSepolia() public returns (address implementation, address proxy) {
        uint256 deployerKey = _loadPrivateKey("OWNER_PK_BASE_SEPOLIA");
        address owner = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy implementation (upgradeable, no constructor)
        BountyEscrow impl = new BountyEscrow();

        // Encode initialize data for the proxy
        bytes memory initData = abi.encodeCall(
            BountyEscrow.initialize,
            (BASE_SEPOLIA_USDC, FEE_BPS, owner)
        );

        // Deploy transparent proxy pointing to implementation
        BountyEscrowProxy proxyInstance = new BountyEscrowProxy(
            address(impl),
            owner,
            initData
        );

        vm.stopBroadcast();

        console2.log("BountyEscrow implementation:", address(impl));
        console2.log("BountyEscrow Proxy (use this in app):", address(proxyInstance));
        console2.log("Upgrade admin / owner:", owner);
        console2.log(
            "To withdraw fees later, call withdrawFees(token, TREASURY_BASE_SEPOLIA, amount) from owner."
        );

        return (address(impl), address(proxyInstance));
    }

    function _loadPrivateKey(string memory envVar) internal returns (uint256 key) {
        try vm.envUint(envVar) returns (uint256 value) {
            return value;
        } catch {
            string memory rawKey = vm.envString(envVar);
            if (!_has0xPrefix(rawKey)) {
                string memory prefixed = string.concat("0x", rawKey);
                vm.setEnv(envVar, prefixed);
                return vm.envUint(envVar);
            }
            revert(string.concat("Invalid ", envVar, " format"));
        }
    }

    function _has0xPrefix(string memory input) internal pure returns (bool) {
        bytes memory data = bytes(input);
        return data.length >= 2 && data[0] == "0" && (data[1] == "x" || data[1] == "X");
    }
}

