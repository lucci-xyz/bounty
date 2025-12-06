// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IBountyEscrow {
    function setAllowedToken(address token, bool allowed) external;
    function allowedTokens(address token) external view returns (bool);
    function owner() external view returns (address);
}

/**
 * @title AllowToken
 * @notice Script to allow/disallow tokens in the BountyEscrow contract
 * 
 * Usage:
 *   # Allow a token on Base Sepolia
 *   forge script scripts/AllowToken.s.sol:AllowToken \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --private-key $OWNER_PK_BASE_SEPOLIA \
 *     --sig "run(address,address,bool)" \
 *     <ESCROW_ADDRESS> <TOKEN_ADDRESS> true
 *
 *   # Check if a token is allowed
 *   forge script scripts/AllowToken.s.sol:AllowToken \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --sig "check(address,address)" \
 *     <ESCROW_ADDRESS> <TOKEN_ADDRESS>
 */
contract AllowToken is Script {
    function run(address escrow, address token, bool allowed) external {
        IBountyEscrow bountyEscrow = IBountyEscrow(escrow);
        
        console2.log("Escrow:", escrow);
        console2.log("Token:", token);
        console2.log("Setting allowed:", allowed);
        console2.log("Owner:", bountyEscrow.owner());
        
        vm.startBroadcast();
        bountyEscrow.setAllowedToken(token, allowed);
        vm.stopBroadcast();
        
        bool isAllowed = bountyEscrow.allowedTokens(token);
        console2.log("Token now allowed:", isAllowed);
    }
    
    function check(address escrow, address token) external view {
        IBountyEscrow bountyEscrow = IBountyEscrow(escrow);
        bool isAllowed = bountyEscrow.allowedTokens(token);
        console2.log("Escrow:", escrow);
        console2.log("Token:", token);
        console2.log("Is allowed:", isAllowed);
    }
}

