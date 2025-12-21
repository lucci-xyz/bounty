// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BountyEscrow} from "@/contracts/current/BountyEscrow.sol";
import {BountyEscrowProxy} from "@/contracts/proxy/BountyEscrowProxy.sol";

/**
 * Deploys the upgradeable BountyEscrow + proxy.
 *
 * Usage:
 *   Base Mainnet: forge script scripts/DeployBountyEscrow.s.sol:DeployBountyEscrow \
 *                   --sig "deployBaseMainnet()" --rpc-url $BASE_MAINNET_RPC_URL --broadcast --verify
 *
 *   Base Sepolia: forge script scripts/DeployBountyEscrow.s.sol:DeployBountyEscrow \
 *                   --sig "deployBaseSepolia()" --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 *
 *   Mezo Testnet: forge script scripts/DeployBountyEscrow.s.sol:DeployBountyEscrow \
 *                   --sig "deployMezoTestnet()" --rpc-url $MEZO_TESTNET_RPC_URL --broadcast --legacy
 *
 *   Mezo Mainnet: forge script scripts/DeployBountyEscrow.s.sol:DeployBountyEscrow \
 *                   --sig "deployMezoMainnet()" --rpc-url https://mezo.drpc.org --broadcast --legacy
 *
 * NOTE: Protocol fees are withdrawn later via
 *       withdrawFees(token, TREASURY_<NETWORK>, amount)
 */
contract DeployBountyEscrow is Script {
    // Token addresses
    address internal constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address internal constant MEZO_TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    address internal constant MEZO_MAINNET_MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;
    
    uint16 internal constant FEE_BPS = 100; // 1%

    function run() external returns (address implementation, address proxy) {
        return deployBaseSepolia();
    }

    function deployBaseMainnet() public returns (address implementation, address proxy) {
        return _deploy(
            "OWNER_PK_BASE_MAINNET",
            BASE_MAINNET_USDC,
            "Base Mainnet",
            "TREASURY_BASE_MAINNET"
        );
    }

    function deployBaseSepolia() public returns (address implementation, address proxy) {
        return _deploy(
            "OWNER_PK_BASE_SEPOLIA",
            BASE_SEPOLIA_USDC,
            "Base Sepolia",
            "TREASURY_BASE_SEPOLIA"
        );
    }

    function deployMezoTestnet() public returns (address implementation, address proxy) {
        return _deploy(
            "OWNER_PK_MEZO_TESTNET",
            MEZO_TESTNET_MUSD,
            "Mezo Testnet",
            "TREASURY_MEZO_TESTNET"
        );
    }

    function deployMezoMainnet() public returns (address implementation, address proxy) {
        return _deploy(
            "OWNER_PK_MEZO_MAINNET",
            MEZO_MAINNET_MUSD,
            "Mezo Mainnet",
            "TREASURY_MEZO_MAINNET"
        );
    }

    function _deploy(
        string memory ownerKeyEnv,
        address primaryToken,
        string memory networkName,
        string memory treasuryEnv
    ) internal returns (address implementation, address proxy) {
        uint256 deployerKey = _loadPrivateKey(ownerKeyEnv);
        address owner = vm.addr(deployerKey);

        console2.log("Deploying to:", networkName);
        console2.log("Primary token:", primaryToken);
        console2.log("Owner:", owner);

        vm.startBroadcast(deployerKey);

        // Deploy implementation (upgradeable, no constructor)
        BountyEscrow impl = new BountyEscrow();

        // Encode initialize data for the proxy
        bytes memory initData = abi.encodeCall(
            BountyEscrow.initialize,
            (primaryToken, FEE_BPS, owner)
        );

        // Deploy transparent proxy pointing to implementation
        BountyEscrowProxy proxyInstance = new BountyEscrowProxy(
            address(impl),
            owner,
            initData
        );

        vm.stopBroadcast();

        console2.log("----------------------------------------");
        console2.log("BountyEscrow implementation:", address(impl));
        console2.log("BountyEscrow Proxy (use this in app):", address(proxyInstance));
        console2.log("Upgrade admin / owner:", owner);
        console2.log("----------------------------------------");
        console2.log("To withdraw fees later, call:");
        console2.log("  withdrawFees(token,", treasuryEnv, ", amount)");

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

