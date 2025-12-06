# BountyEscrow Contract Specification

Single source-of-truth for BountyEscrow behavior: fees, deadlines, upgradeability.

---

## 1. Contract Locations

| Role | Path | Notes |
|------|------|-------|
| **Old (archived)** | `contracts/archive/BountyEscrow.sol` | Non-upgradeable, USDC-only, has `cancel`. **Do not deploy.** |
| **New (active)** | `contracts/current/BountyEscrow.sol` | Upgradeable, multi-token, fee at funding, no `cancel`. |
| **Proxy** | `contracts/proxy/BountyEscrowProxy.sol` | TransparentUpgradeableProxy wrapper. **App must use this address.** |

---

## 2. Upgradeability Model

**Pattern:** TransparentUpgradeableProxy (OpenZeppelin 5.0.2)

- **Proxy** holds all storage; **implementation** holds logic only.
- **Initialization:** `initialize(primaryToken_, feeBps, initialOwner)` is called via the proxy constructor's `data` argument. This can only run once (`Initializable`).
- **Proxy admin:** The account passed as `admin` to the proxy constructor can call `upgradeTo(newImpl)` or `upgradeToAndCall(...)`.
- **Owner (OwnableUpgradeable):** The `initialOwner` becomes the contract owner and can:
  - `pause()` / `unpause()`
  - `setFeeBps(uint16)`
  - `setAllowedToken(address, bool)`
  - `withdrawFees(token, to, amount)`
  - `rescueToken(token, to, amount)` (non-allowed tokens only)
  - `sweepNative(to)`

**Storage gap:** `uint256[44] __gap` reserved for future upgrades.

---

## 3. Amount + Fee Semantics

| Term | Definition |
|------|------------|
| `amount` | **Net bounty** = what the claimer receives on `resolve`. |
| `feeBps` | Protocol fee in basis points (1 bps = 0.01%). Max 1000 (10%). |
| `fee` | `amount * feeBps / 10_000` |
| **Sponsor pays** | `amount + fee` at `createBounty`, `createBountyWithToken`, or `fund`. |

**Flow:**

1. **Create/Fund:** Sponsor transfers `amount + fee` to escrow. Escrow stores `amount` in the `Bounty` struct and increments `totalEscrowedByToken[token]` by `amount`. Fee portion stays in contract; `totalFeesAccrued += fee`.
2. **Resolve:** Claimer receives full `amount`. No additional fee taken. `totalEscrowedByToken[token] -= amount`.
3. **RefundExpired:** Sponsor receives `amount` only. **Fee is non-refundable.**

**Tracking:**

- `totalEscrowedByToken[token]`: net principal locked across all open bounties for that token.
- `totalFeesAccrued`: cumulative fees ever collected (informational, not current balance).

---

## 4. Deadline Semantics

**There is NO `cancel` function.**

| Condition | Allowed Action |
|-----------|----------------|
| `block.timestamp <= deadline` | Resolver can call `resolve(bountyId, recipient)` |
| `block.timestamp > deadline` | Sponsor can call `refundExpired(bountyId)` |

**Errors:**

| Error | Meaning |
|-------|---------|
| `DeadlinePassed` | Attempted `resolve` after deadline. |
| `DeadlineNotReached` | Attempted `refundExpired` before deadline. |

**Implication:** Funds are locked until either:
1. Resolver resolves before or at deadline, **or**
2. Sponsor refunds after deadline.

---

## 5. Tokens and Allowlist

**Primary token:** Set at `initialize`. Exposed via:
- `primaryToken()` / `usdc()` → address
- `usdcDecimals()` → decimals (defaults to 6 if call fails)

**Allowlist:**
- `allowedTokens[token]` mapping (bool).
- Primary token is auto-allowed at initialization.
- Owner calls `setAllowedToken(token, allowed)` to add/remove.
- Cannot remove a token with non-zero `totalEscrowedByToken[token]`.

**Bounty creation:**
- `createBounty(...)` uses primary token.
- `createBountyWithToken(token, ...)` uses any allowed token.

**Per-bounty storage:** Each `Bounty` stores its `token` address. Escrow and fees are tracked per token.

**Assumptions:** Only standard, non-rebasing, non-fee-on-transfer ERC-20s.

---

## 6. Fees and Admin Flows

### Reading fees

```solidity
availableFees(address token) → uint256
```
Returns `balanceOf(token) - totalEscrowedByToken[token]`. This is the withdrawable fee balance for that token.

### Withdrawing fees

```solidity
withdrawFees(address token, address to, uint256 amount)
```
- Owner-only.
- If `amount == 0`, withdraws full `availableFees(token)`.
- Reverts with `InsufficientFees` if `amount > availableFees(token)`.
- Cannot touch escrowed principal.

### Informational

- `totalFeesAccrued`: cumulative fees ever collected (all tokens combined, not current balance).
- `feeBps`: current fee rate (can be changed by owner).

### Pausing

`whenNotPaused` modifier wraps:
- `createBounty` / `createBountyWithToken`
- `fund`
- `resolve`
- `refundExpired`

**Remain callable when paused:**
- `withdrawFees`
- `rescueToken`
- `sweepNative`
- `pause` / `unpause`
- `setFeeBps` / `setAllowedToken`

---

## Quick Reference

```
Sponsor pays:     amount + fee
Claimer receives: amount (full)
Refund returns:   amount (fee non-refundable)
Fee calc:         fee = amount * feeBps / 10_000
Max fee:          1000 bps (10%)
```

