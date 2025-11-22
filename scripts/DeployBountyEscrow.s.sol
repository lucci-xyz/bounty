// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BountyEscrow} from "@/contracts/current/BountyEscrow.sol";

contract DeployBountyEscrow is Script {
    address internal constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address internal constant MEZO_TESTNET_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    uint16 internal constant FEE_BPS = 100;

    function run() external returns (BountyEscrow deployed) {
        return deployBaseSepolia();
    }

    function deployBaseSepolia() public returns (BountyEscrow deployed) {
        address initialOwner = vm.envAddress("BASE_SEPOLIA_OWNER_WALLET");
        uint256 deployerKey = _loadPrivateKey("BASE_SEPOLIA_OWNER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        deployed = new BountyEscrow(BASE_SEPOLIA_USDC, FEE_BPS, initialOwner);
        vm.stopBroadcast();

        console2.log("BountyEscrow deployed to Base Sepolia:", address(deployed));
    }

    function deployMezoTestnet() public returns (BountyEscrow deployed) {
        address initialOwner = vm.envAddress("MEZO_TESTNET_OWNER_WALLET");
        uint256 deployerKey = _loadPrivateKey("MEZO_TESTNET_OWNER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        deployed = new BountyEscrow(MEZO_TESTNET_MUSD, FEE_BPS, initialOwner);
        vm.stopBroadcast();

        console2.log("BountyEscrow deployed to Mezo Testnet:", address(deployed));
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

