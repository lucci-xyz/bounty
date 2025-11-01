# Smart Contracts Documentation

Complete reference for BountyPay smart contracts deployed on Base Sepolia.

---

## Contract Addresses

| Contract | Address | Network |
|----------|---------|---------|
| BountyEscrow | [`0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD`](https://sepolia.basescan.org/address/0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD) | Base Sepolia |
| FeeVault | [`0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`](https://sepolia.basescan.org/address/0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3) | Base Sepolia |
| USDC (Test) | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | Base Sepolia |

**Chain ID:** 84532  
**RPC URL:** `https://sepolia.base.org`

---

## BountyEscrow Contract

Main escrow contract for holding and managing bounty funds.

### State Machine

```plaintext
None → Open → Resolved
          ↓
      Canceled (before deadline)
          ↓
      Refunded (after deadline)
```

Terminal states (Resolved, Refunded, Canceled) are final and cannot be changed.

---

### Functions

#### createBounty

Create and fund a new bounty.

```solidity
function createBounty(
  address resolver,
  bytes32 repoIdHash,
  uint64 issueNumber,
  uint64 deadline,
  uint256 amount
) external nonReentrant whenNotPaused returns (bytes32 bountyId)
```

**Parameters:**

- `resolver` - Address authorized to resolve this bounty
- `repoIdHash` - Hash of repository identifier
- `issueNumber` - GitHub issue number
- `deadline` - Unix timestamp (must be in future)
- `amount` - USDC amount to escrow (in token units, e.g., 1000000 = 1 USDC if 6 decimals)

**Returns:**

- `bountyId` - Deterministic bounty ID: `keccak256(msg.sender, repoIdHash, issueNumber)`

**Requirements:**

- `resolver` must not be zero address
- `repoIdHash` must not be zero
- `issueNumber` must not be zero
- `deadline` must be in the future
- `amount` must be greater than zero
- Bounty with same `(sponsor, repoIdHash, issueNumber)` must not already exist
- Caller must have approved USDC spending for this contract

**Events:**

- `BountyCreated(bytes32 indexed bountyId, address indexed sponsor, bytes32 indexed repoIdHash, uint64 issueNumber, uint64 deadline, address resolver, uint256 amount)`

**Example:**

```javascript
const tx = await escrowContract.createBounty(
  resolverAddress,
  repoIdHash,
  42, // issue number
  Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
  ethers.parseUnits("100", 6) // 100 USDC (assuming 6 decimals)
);
```

---

#### fund

Top up an existing open bounty.

```solidity
function fund(bytes32 bountyId, uint256 amount) external nonReentrant whenNotPaused
```

**Parameters:**

- `bountyId` - ID of the bounty to fund
- `amount` - Additional USDC amount to add

**Requirements:**

- Bounty must exist and be in `Open` status
- Caller must be the bounty sponsor
- `amount` must be greater than zero
- New total amount must not overflow `uint96`

**Events:**

- `Funded(bytes32 indexed bountyId, uint256 newAmount)`

**Example:**

```javascript
const tx = await escrowContract.fund(
  bountyId,
  ethers.parseUnits("50", 6) // Add 50 USDC
);
```

---

#### cancel

Cancel an open bounty before the deadline and retrieve funds.

```solidity
function cancel(bytes32 bountyId) external nonReentrant whenNotPaused
```

**Parameters:**

- `bountyId` - ID of the bounty to cancel

**Requirements:**

- Bounty must exist and be in `Open` status
- Caller must be the bounty sponsor
- Must be called before deadline

**Events:**

- `Canceled(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)`

**Example:**

```javascript
const tx = await escrowContract.cancel(bountyId);
```

---

#### resolve

Resolve an open bounty and pay out to recipient. Only callable by the designated resolver.

```solidity
function resolve(bytes32 bountyId, address recipient) external nonReentrant whenNotPaused
```

**Parameters:**

- `bountyId` - ID of the bounty to resolve
- `recipient` - Address to receive the net payout

**Requirements:**

- Bounty must exist and be in `Open` status
- Caller must be the designated resolver
- `recipient` must not be zero address

**Effects:**

- Calculates protocol fee: `fee = amount * feeBps / 10000`
- Pays net amount to recipient: `amount - fee`
- Pays fee to FeeVault
- Sets bounty status to `Resolved`

**Events:**

- `Resolved(bytes32 indexed bountyId, address indexed recipient, uint256 net, uint256 fee)`

**Example:**

```javascript
const tx = await escrowContract.resolve(bountyId, recipientAddress);
```

**Note:** This is typically called by the backend resolver wallet when a PR is merged.

---

#### refundExpired

Refund an expired open bounty back to the sponsor. Only callable by sponsor after deadline.

```solidity
function refundExpired(bytes32 bountyId) external nonReentrant whenNotPaused
```

**Parameters:**

- `bountyId` - ID of the bounty to refund

**Requirements:**

- Bounty must exist and be in `Open` status
- Caller must be the bounty sponsor
- Current timestamp must be >= deadline

**Events:**

- `Refunded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)`

**Example:**

```javascript
const tx = await escrowContract.refundExpired(bountyId);
```

---

### View Functions

#### getBounty

Get complete bounty information.

```solidity
function getBounty(bytes32 bountyId) external view returns (Bounty memory)
```

**Returns:**

```solidity
struct Bounty {
  bytes32 repoIdHash;
  address sponsor;
  address resolver;
  uint96 amount;
  uint64 deadline;
  uint64 issueNumber;
  Status status;
}
```

**Status Enum:**

- `0` - None
- `1` - Open
- `2` - Resolved
- `3` - Refunded
- `4` - Canceled

**Example:**

```javascript
const bounty = await escrowContract.getBounty(bountyId);
console.log(bounty.amount); // BigNumber
console.log(bounty.status); // 0-4
```

---

#### computeBountyId

Compute the deterministic bounty ID for given parameters.

```solidity
function computeBountyId(
  address sponsor,
  bytes32 repoIdHash,
  uint64 issueNumber
) public pure returns (bytes32 bountyId)
```

**Returns:**

- `keccak256(abi.encodePacked(sponsor, repoIdHash, issueNumber))`

**Example:**

```javascript
const bountyId = await escrowContract.computeBountyId(
  sponsorAddress,
  repoIdHash,
  42
);
```

---

#### usdc

Get the USDC token contract address.

```solidity
function usdc() external view returns (IERC20)
```

---

#### usdcDecimals

Get cached USDC decimals (defaults to 6 if token doesn't implement metadata).

```solidity
function usdcDecimals() external view returns (uint8)
```

---

### Admin Functions

#### pause / unpause

Pause/unpause all state-changing functions. Owner only.

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
```

---

#### setFeeParams

Update protocol fee and fee vault. Owner only.

```solidity
function setFeeParams(uint16 _feeBps, address _feeVault) external onlyOwner
```

**Parameters:**

- `_feeBps` - New fee in basis points (max 1000 = 10%)
- `_feeVault` - New fee vault address

**Requirements:**

- `_feeBps` must be <= `MAX_FEE_BPS` (1000)
- `_feeVault` must not be zero address

**Events:**

- `FeeParamsUpdated(uint16 feeBps, address feeVault)`

---

## FeeVault Contract

Protocol fee collection vault. Receives fees from BountyEscrow resolutions.

### FeeVault Functions

#### withdraw

Withdraw ERC-20 tokens. Owner only.

```solidity
function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant
```

**Parameters:**

- `token` - ERC-20 token address
- `to` - Recipient address
- `amount` - Amount to withdraw

**Requirements:**

- `token` and `to` must not be zero addresses
- `amount` must be greater than zero

**Events:**

- `Withdraw(address indexed token, address indexed to, uint256 amount)`

**Example:**

```javascript
const tx = await feeVault.withdraw(
  usdcAddress,
  ownerAddress,
  ethers.parseUnits("1000", 6) // Withdraw 1000 USDC
);
```

---

#### sweepNative

Sweep all native ETH to recipient. Owner only.

```solidity
function sweepNative(address payable to) external onlyOwner nonReentrant
```

**Parameters:**

- `to` - Recipient address

**Requirements:**

- `to` must not be zero address
- Contract must have non-zero ETH balance

**Events:**

- `SweepNative(address indexed to, uint256 amount)`

**Example:**

```javascript
const tx = await feeVault.sweepNative(ownerAddress);
```

---

#### receive

Receive native ETH (can be sent directly to contract).

```solidity
receive() external payable
```

**Events:**

- `DepositNative(address indexed from, uint256 amount)`

---

## Integration Examples

### Creating a Bounty (Frontend)

```javascript
import { ethers } from 'ethers';
import EscrowABI from './abis/BountyEscrow.json';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const escrowAddress = '0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD';
const escrowContract = new ethers.Contract(escrowAddress, EscrowABI, signer);

// First, approve USDC spending
const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, signer);

const amount = ethers.parseUnits("100", 6); // 100 USDC
await usdcContract.approve(escrowAddress, amount);

// Compute repo ID hash
const repoIdHash = ethers.keccak256(ethers.toUtf8Bytes('owner/repo'));

// Create bounty
const resolverAddress = '0x...'; // Backend resolver wallet
const issueNumber = 42;
const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

const tx = await escrowContract.createBounty(
  resolverAddress,
  repoIdHash,
  issueNumber,
  deadline,
  amount
);

const receipt = await tx.wait();
console.log('Bounty created:', receipt.transactionHash);
```

### Resolving a Bounty (Backend)

```javascript
import { ethers } from 'ethers';
import EscrowABI from './abis/BountyEscrow.json';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.RESOLVER_PRIVATE_KEY, provider);

const escrowAddress = '0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD';
const escrowContract = new ethers.Contract(escrowAddress, EscrowABI, wallet);

const bountyId = '0x...';
const recipientAddress = '0x...'; // Contributor's wallet

const tx = await escrowContract.resolve(bountyId, recipientAddress);
const receipt = await tx.wait();
console.log('Bounty resolved:', receipt.transactionHash);
```

### Querying Bounty State

```javascript
const bounty = await escrowContract.getBounty(bountyId);

console.log('Status:', bounty.status); // 1 = Open
console.log('Amount:', ethers.formatUnits(bounty.amount, 6)); // USDC
console.log('Sponsor:', bounty.sponsor);
console.log('Resolver:', bounty.resolver);
console.log('Deadline:', new Date(Number(bounty.deadline) * 1000));
```

---

## Gas Estimates

Approximate gas costs (Base Sepolia):

| Function | Gas Estimate |
|----------|--------------|
| `createBounty` | ~150,000 |
| `fund` | ~80,000 |
| `cancel` | ~70,000 |
| `resolve` | ~100,000 |
| `refundExpired` | ~70,000 |
| `getBounty` | ~25,000 (view) |
| `computeBountyId` | ~200 (pure) |

**Note:** Actual gas costs may vary. Check recent transactions on BaseScan for current estimates.

---

## Security Considerations

### For Sponsors

- **Verify resolver**: Ensure the resolver address is correct before creating bounty
- **Check deadline**: Set appropriate deadline for issue completion
- **Monitor status**: Check bounty status before deadline expires
- **Trust resolver**: The resolver has authority to pay out your bounty

### For Contributors

- **Link wallet**: Must link GitHub account to wallet before submitting PR
- **Verify bounty**: Check bounty exists and is in `Open` status
- **PR must close issue**: PR must actually close the issue (not just reference it)

### For Developers

- **Resolver security**: Protect resolver private key
- **Monitor balance**: Ensure resolver wallet has ETH for gas
- **Error handling**: Handle transaction failures gracefully
- **Reentrancy**: All state-changing functions use `ReentrancyGuard`

---

## Events Reference

### BountyEscrow Events

```solidity
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

event Canceled(
  bytes32 indexed bountyId,
  address indexed sponsor,
  uint256 amount
);

event FeeParamsUpdated(uint16 feeBps, address feeVault);
```

### FeeVault Events

```solidity
event Withdraw(address indexed token, address indexed to, uint256 amount);
event DepositNative(address indexed from, uint256 amount);
event SweepNative(address indexed to, uint256 amount);
```

---

## Error Handling

### Common Errors

**`InvalidParams()`** - Parameter validation failed  
**`AlreadyExists()`** - Bounty with same parameters already exists  
**`NotOpen()`** - Bounty is not in Open status  
**`NotSponsor()`** - Caller is not the bounty sponsor  
**`NotResolver()`** - Caller is not the designated resolver  
**`DeadlineNotReached()`** - Cannot refund before deadline  
**`ZeroAddress()`** - Zero address provided where not allowed  
**`ZeroAmount()`** - Zero amount provided where not allowed  

---

## Contract Architecture

### Dependencies

- **OpenZeppelin Contracts v5.0.2**
  - `ReentrancyGuard` - Protection against reentrancy attacks
  - `Pausable` - Emergency pause functionality
  - `Ownable` - Access control
  - `SafeERC20` - Safe ERC-20 token transfers
  - `SafeCast` - Safe integer casting
  - `Math` - Overflow-safe math operations

### Design Principles

1. **Minimal trust**: Sponsors only trust resolver, not platform
2. **Deterministic IDs**: Bounty IDs computed from parameters
3. **Immutable resolver**: Resolver set at creation, cannot be changed
4. **Fee transparency**: Fees calculated and visible on resolution
5. **Terminal states**: Resolved/Refunded/Canceled states are final

---

## Testing

Contracts are deployed on Base Sepolia for testing. Use test USDC from the faucet or bridge.

### Test Checklist

- [ ] Create bounty with valid parameters
- [ ] Create bounty fails with invalid parameters
- [ ] Top up existing bounty
- [ ] Cancel open bounty before deadline
- [ ] Resolve bounty as resolver
- [ ] Resolve fails if not resolver
- [ ] Refund expired bounty
- [ ] Refund fails before deadline
- [ ] Query bounty state
- [ ] Compute bounty ID matches

---

## Next Steps

- [API Documentation](api.md) - Backend API integration
- [Architecture](architecture.md) - System design overview
- [Local Development](local-development.md) - Set up local environment
