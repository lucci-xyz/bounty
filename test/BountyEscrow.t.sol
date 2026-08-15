// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts@5.0.2/token/ERC20/ERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts@5.0.2/proxy/ERC1967/ERC1967Proxy.sol";

import {BountyEscrow} from "../contracts/current/BountyEscrow.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * Tests for the escrow that holds every bounty's funds.
 *
 * The emphasis is on the properties that decide who gets paid: the resolver
 * allowlist, the two disjoint settlement windows, and the guarantee that a
 * refund can never take money that a payout is still entitled to.
 */
contract BountyEscrowTest is Test {
    BountyEscrow internal escrow;
    MockUSDC internal usdc;

    address internal owner = address(0xA11CE);
    address internal resolver = address(0xB0B);
    address internal sponsor = address(0xC0FFEE);
    address internal contributor = address(0xD00D);
    address internal attacker = address(0xBAD);

    bytes32 internal constant REPO = keccak256("acme/api");
    uint64 internal constant ISSUE = 42;
    uint256 internal constant AMOUNT = 5_000e6;

    function setUp() public {
        usdc = new MockUSDC();

        BountyEscrow impl = new BountyEscrow();
        bytes memory initData =
            abi.encodeCall(BountyEscrow.initialize, (address(usdc), 100, owner, resolver));
        escrow = BountyEscrow(payable(address(new ERC1967Proxy(address(impl), initData))));

        usdc.mint(sponsor, 1_000_000e6);
        usdc.mint(attacker, 1_000_000e6);

        vm.warp(1_000_000);
    }

    function _fund(address who, uint64 deadline) internal returns (bytes32 bountyId) {
        vm.startPrank(who);
        usdc.approve(address(escrow), type(uint256).max);
        bountyId = escrow.createBounty(resolver, REPO, ISSUE, deadline, AMOUNT);
        vm.stopPrank();
    }

    // ---------------- Implementation lock ----------------

    function test_implementationCannotBeInitialized() public {
        BountyEscrow impl = new BountyEscrow();
        vm.expectRevert();
        impl.initialize(address(usdc), 100, attacker, attacker);
    }

    // ---------------- Resolver allowlist ----------------

    function test_sponsorCannotAppointThemselvesAsResolver() public {
        // The core trust property: a self-appointed resolver could take back a
        // bounty after the work merged.
        vm.startPrank(attacker);
        usdc.approve(address(escrow), type(uint256).max);
        vm.expectRevert(BountyEscrow.ResolverNotAllowed.selector);
        escrow.createBounty(attacker, REPO, ISSUE, uint64(block.timestamp + 30 days), AMOUNT);
        vm.stopPrank();
    }

    function test_ownerCanAllowAndRevokeResolvers() public {
        address second = address(0xFEED);

        vm.prank(owner);
        escrow.setAllowedResolver(second, true);
        assertTrue(escrow.allowedResolvers(second));

        vm.prank(owner);
        escrow.setAllowedResolver(second, false);
        assertFalse(escrow.allowedResolvers(second));
    }

    function test_nonOwnerCannotAllowResolver() public {
        vm.prank(attacker);
        vm.expectRevert();
        escrow.setAllowedResolver(attacker, true);
    }

    function test_revokingResolverDoesNotStrandExistingBounties() public {
        uint64 deadline = uint64(block.timestamp + 30 days);
        bytes32 id = _fund(sponsor, deadline);

        vm.prank(owner);
        escrow.setAllowedResolver(resolver, false);

        vm.prank(resolver);
        escrow.resolve(id, contributor);

        assertEq(usdc.balanceOf(contributor), AMOUNT);
    }

    // ---------------- Settlement windows ----------------

    function test_resolveSucceedsInsideGraceWindow() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);

        // A PR that merged before the deadline but whose payout landed late.
        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE());

        vm.prank(resolver);
        escrow.resolve(id, contributor);

        assertEq(usdc.balanceOf(contributor), AMOUNT);
    }

    function test_resolveRevertsAfterGraceWindow() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);

        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE() + 1);

        vm.prank(resolver);
        vm.expectRevert(BountyEscrow.DeadlinePassed.selector);
        escrow.resolve(id, contributor);
    }

    function test_refundRevertsInsideGraceWindow() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);

        // Sponsor tries to take the money back while a payout is still owed.
        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE());

        vm.prank(sponsor);
        vm.expectRevert(BountyEscrow.DeadlineNotReached.selector);
        escrow.refundExpired(id);
    }

    function test_refundSucceedsAfterGraceWindow() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);
        uint256 before = usdc.balanceOf(sponsor);

        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE() + 1);

        vm.prank(sponsor);
        escrow.refundExpired(id);

        assertEq(usdc.balanceOf(sponsor), before + AMOUNT);
    }

    /// The windows must never overlap, or a refund could race a payout.
    function testFuzz_resolveAndRefundAreNeverBothAllowed(uint64 offset) public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);

        offset = uint64(bound(offset, 0, 400 days));
        vm.warp(uint256(deadline) + offset);

        bool resolveOpen = offset <= escrow.RESOLVE_GRACE();

        if (resolveOpen) {
            vm.prank(sponsor);
            vm.expectRevert(BountyEscrow.DeadlineNotReached.selector);
            escrow.refundExpired(id);

            vm.prank(resolver);
            escrow.resolve(id, contributor);
            assertEq(usdc.balanceOf(contributor), AMOUNT);
        } else {
            vm.prank(resolver);
            vm.expectRevert(BountyEscrow.DeadlinePassed.selector);
            escrow.resolve(id, contributor);

            vm.prank(sponsor);
            escrow.refundExpired(id);
        }
    }

    // ---------------- Authorisation ----------------

    function test_onlyResolverCanResolve() public {
        bytes32 id = _fund(sponsor, uint64(block.timestamp + 30 days));

        vm.prank(attacker);
        vm.expectRevert(BountyEscrow.NotResolver.selector);
        escrow.resolve(id, attacker);

        vm.prank(sponsor);
        vm.expectRevert(BountyEscrow.NotResolver.selector);
        escrow.resolve(id, sponsor);
    }

    function test_onlySponsorCanRefund() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);
        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE() + 1);

        vm.prank(attacker);
        vm.expectRevert(BountyEscrow.NotSponsor.selector);
        escrow.refundExpired(id);
    }

    function test_cannotResolveTwice() public {
        bytes32 id = _fund(sponsor, uint64(block.timestamp + 30 days));

        vm.prank(resolver);
        escrow.resolve(id, contributor);

        vm.prank(resolver);
        vm.expectRevert(BountyEscrow.NotOpen.selector);
        escrow.resolve(id, attacker);

        assertEq(usdc.balanceOf(contributor), AMOUNT);
    }

    function test_cannotRefundAfterResolve() public {
        uint64 deadline = uint64(block.timestamp + 10 days);
        bytes32 id = _fund(sponsor, deadline);

        vm.prank(resolver);
        escrow.resolve(id, contributor);

        vm.warp(uint256(deadline) + escrow.RESOLVE_GRACE() + 1);
        vm.prank(sponsor);
        vm.expectRevert(BountyEscrow.NotOpen.selector);
        escrow.refundExpired(id);
    }

    // ---------------- Accounting ----------------

    function test_feeIsChargedOnTopAndContributorGetsFullAmount() public {
        uint256 before = usdc.balanceOf(sponsor);
        bytes32 id = _fund(sponsor, uint64(block.timestamp + 30 days));

        uint256 fee = (AMOUNT * escrow.feeBps()) / 10_000;
        assertEq(usdc.balanceOf(sponsor), before - AMOUNT - fee, "sponsor pays amount + fee");
        assertEq(escrow.totalEscrowedByToken(address(usdc)), AMOUNT);

        vm.prank(resolver);
        escrow.resolve(id, contributor);

        assertEq(usdc.balanceOf(contributor), AMOUNT, "contributor receives the full net amount");
        assertEq(escrow.availableFees(address(usdc)), fee, "only the fee is withdrawable");
        assertEq(escrow.totalEscrowedByToken(address(usdc)), 0);
    }

    function test_ownerCannotWithdrawEscrowedFunds() public {
        _fund(sponsor, uint64(block.timestamp + 30 days));
        uint256 fee = (AMOUNT * escrow.feeBps()) / 10_000;

        vm.prank(owner);
        vm.expectRevert(BountyEscrow.InsufficientFees.selector);
        escrow.withdrawFees(address(usdc), owner, fee + 1);

        vm.prank(owner);
        escrow.withdrawFees(address(usdc), owner, 0);
        assertEq(usdc.balanceOf(owner), fee, "owner may take the fee and nothing more");
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT, "escrow still fully covers the bounty");
    }

    function test_escrowStaysSolventAcrossManyBounties() public {
        uint64 deadline = uint64(block.timestamp + 30 days);

        vm.startPrank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
        for (uint64 i = 1; i <= 10; i++) {
            escrow.createBounty(resolver, REPO, i, deadline, AMOUNT);
        }
        vm.stopPrank();

        assertGe(
            usdc.balanceOf(address(escrow)),
            escrow.totalEscrowedByToken(address(usdc)),
            "balance must always cover escrowed obligations"
        );
    }

    function test_feeBpsCannotExceedMaximum() public {
        // Read the constant BEFORE arming the cheatcodes. An external call in
        // the argument list is made after `expectRevert` is armed, so it is what
        // the cheatcode matches against — and it consumes the `prank` too, so
        // setFeeBps would be called by the test contract rather than the owner.
        uint16 maxFee = escrow.MAX_FEE_BPS();

        vm.prank(owner);
        vm.expectRevert(BountyEscrow.InvalidParams.selector);
        escrow.setFeeBps(maxFee + 1);
    }

    // ---------------- Input validation ----------------

    function test_deadlineMustBeInTheFuture() public {
        vm.startPrank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
        vm.expectRevert(BountyEscrow.InvalidParams.selector);
        escrow.createBounty(resolver, REPO, ISSUE, uint64(block.timestamp), AMOUNT);
        vm.stopPrank();
    }

    function test_cannotCreateDuplicateBounty() public {
        uint64 deadline = uint64(block.timestamp + 30 days);
        _fund(sponsor, deadline);

        vm.startPrank(sponsor);
        vm.expectRevert(BountyEscrow.AlreadyExists.selector);
        escrow.createBounty(resolver, REPO, ISSUE, deadline, AMOUNT);
        vm.stopPrank();
    }

    function test_disallowedTokenIsRejected() public {
        MockUSDC other = new MockUSDC();
        other.mint(sponsor, 1_000e6);

        vm.startPrank(sponsor);
        other.approve(address(escrow), type(uint256).max);
        vm.expectRevert(BountyEscrow.TokenNotAllowed.selector);
        escrow.createBountyWithToken(
            address(other), resolver, REPO, ISSUE, uint64(block.timestamp + 30 days), AMOUNT
        );
        vm.stopPrank();
    }

    function test_pausedContractBlocksCreationAndSettlement() public {
        bytes32 id = _fund(sponsor, uint64(block.timestamp + 30 days));

        vm.prank(owner);
        escrow.pause();

        vm.prank(resolver);
        vm.expectRevert();
        escrow.resolve(id, contributor);

        vm.prank(owner);
        escrow.unpause();

        vm.prank(resolver);
        escrow.resolve(id, contributor);
        assertEq(usdc.balanceOf(contributor), AMOUNT);
    }

    function test_rescueCannotTouchAnAllowedBountyToken() public {
        _fund(sponsor, uint64(block.timestamp + 30 days));

        vm.prank(owner);
        vm.expectRevert(BountyEscrow.CannotRescueAllowedToken.selector);
        escrow.rescueToken(address(usdc), owner, AMOUNT);
    }
}
