# Mezo Hackathon Requirements

Comprehensive checklist and requirements for Mezo Hackathon submission.

---

## Hackathon Overview

**Focus:** Self-service banking on Bitcoin rails powered by Mezo  
**Key Product:** MUSD (Bitcoin-backed stablecoin at 1% fixed rates)  
**Tracks:** Daily Bitcoin Applications, Advanced DeFi Solutions, Financial Access & Mass Adoption

---

## Mandatory Requirements

### ✅ MUSD Integration (CRITICAL)

- [ ] **Project must integrate MUSD** - Core requirement, non-negotiable
  - Implement MUSD as payment token in BountyEscrow
  - Support bounty creation with MUSD
  - Enable payouts in MUSD
  - Display MUSD balances in UI

### ✅ Working Demo on Testnet (CRITICAL)

- [ ] **Deploy all contracts on Mezo testnet**
  - BountyEscrow with MUSD support
  - FeeVault contract
  - Verify contracts on block explorer
- [ ] **Functional end-to-end flows**
  - Create bounty with MUSD
  - Link wallet functionality
  - Automated payout on PR merge
  - Refund expired bounties
- [ ] **Live demo URL**
  - Accessible frontend
  - Working GitHub integration
  - Real testnet transactions

### ✅ Original Work (CRITICAL)

- [ ] **Developed during hackathon OR completely new approach**
  - BountyPay exists pre-hackathon
  - MUSD integration is NEW work during hackathon
  - Multi-token architecture is NEW approach
  - Mezo deployment is NEW
- [ ] **Document development timeline**
  - Git commits during hackathon period
  - Feature branch for MUSD integration
  - Clear PRs showing new work

### ✅ KYB for Prize Distribution

- [ ] **Complete KYB (Know Your Business) process**
  - Team/individual identity verification
  - Business registration details (if applicable)
  - Banking information for prize payout
  - Required for prize eligibility

### ⚠️ Mainnet Deployment (For Mezo Incentives Only)

- [ ] **Conditional requirement for Mezo incentives**
  - Live on Mezo mainnet OR Ethereum mainnet
  - Not required for hackathon prizes
  - Required for additional Mezo milestone incentives
  - Plan mainnet deployment post-hackathon

---

## Track Selection

### Recommended Track: Daily Bitcoin Applications

**Why this track:**

- BountyPay is for "everyone" - sponsors, contributors, maintainers
- Makes Bitcoin useful for everyday developer workflows
- Practical utility beyond DeFi speculation
- Integrates with existing tools (GitHub)

**Track Requirements Met:**

- ✅ Daily use case (funding OSS contributions)
- ✅ Practical utility (automated bounty payouts)
- ✅ Broad accessibility (any GitHub user)
- ✅ Solves real problem (OSS funding friction)

### Alternative Track: Financial Access & Mass Adoption

**Alignment:**

- ✅ Enables Bitcoin holders to participate in OSS economy
- ✅ No need to sell BTC to fund bounties
- ✅ Contributors access Bitcoin-backed stable payments
- ✅ Reduces barriers to entry (automated, trust-minimized)

**Could also argue for:** Advanced DeFi Solutions (escrow + MUSD = DeFi primitive)

---

## Judging Criteria Alignment

### 1. Mezo Integration (30%)

**How we excel:**

- ✅ MUSD as primary payment token
- ✅ Enables productive Bitcoin capital use
- ✅ Maintains sponsor BTC exposure
- ✅ Integration with Mezo's self-service model
- ✅ Real utility beyond simple token swap

**Implementation depth:**

```solidity
// BountyEscrow natively supports MUSD
function createBounty(
    address resolver,
    bytes32 repoIdHash,
    uint64 issueNumber,
    uint64 deadline,
    uint256 amount,
    address token    // MUSD token address
) external returns (bytes32 bountyId)
```

**Unique value:**

- First automated bounty platform with Bitcoin-backed payments
- Connects GitHub workflows to Mezo ecosystem
- Enables Bitcoin holders to sponsor OSS without selling

### 2. Technical Implementation (30%)

**Strengths:**

- ✅ Production-quality smart contracts
- ✅ OpenZeppelin 5.0.2 security standards
- ✅ ReentrancyGuard, Pausable, SafeERC20
- ✅ Comprehensive test coverage
- ✅ Clean architecture (contracts, backend, frontend)
- ✅ Multi-token support with whitelist security model
- ✅ GitHub webhook integration
- ✅ SIWE authentication

**Code quality indicators:**

```solidity
// Security best practices
contract BountyEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    
    // Deterministic bounty IDs
    function computeBountyId(
        address sponsor,
        bytes32 repoIdHash,
        uint64 issueNumber
    ) public pure returns (bytes32)
    
    // Overflow-safe fee calculation
    uint256 fee = Math.mulDiv(gross, feeBps, FEE_DENOM);
}
```

**Architecture highlights:**

- Smart contract escrow (trustless)
- Automated resolution (no manual intervention)
- Event-driven design (webhooks)
- Multi-network support (Base, Mezo)

### 3. Business Viability & Use Case (20%)

**Track alignment: Daily Bitcoin Applications**

- ✅ Clear problem: OSS funding is manual, slow, requires trust
- ✅ Clear solution: Automated, trustless bounty payouts with Bitcoin-backed assets
- ✅ Target market: Bitcoin holders + OSS ecosystem (millions of users)
- ✅ Revenue model: 2-5% protocol fees on resolutions

**Market potential:**

- TAM: $1T+ Bitcoin holders + $500B+ OSS economy
- SAM: Bitcoin-holding developers who fund OSS
- SOM: GitHub users with BTC exposure (estimate 10K-100K)

**Competitive moat:**

- First-mover in Bitcoin-backed bounties
- GitHub integration network effects
- Smart contract automation (can't be replicated manually)
- Trust-minimized (vs centralized platforms)

**Traction potential:**

- Existing BountyPay users can adopt MUSD
- Bitcoin community engagement
- OSS maintainer partnerships
- Developer tool positioning

### 4. User Experience (10%)

**UX strengths:**

- ✅ Seamless GitHub workflow integration
- ✅ Wallet connection with SIWE
- ✅ Simple 4-step sponsor flow
- ✅ Zero-action contributor payouts (automated)
- ✅ Clear bounty status tracking
- ✅ Token selection UI

**User journey:**

```plaintext
Sponsor: Issue → Click button → Connect wallet → Approve → Fund (< 2 min)
Contributor: Find issue → Link wallet once → Submit PR → Get paid (automated)
```

**Friction points addressed:**

- ✅ No manual invoicing
- ✅ No spreadsheet tracking
- ✅ No payment delays
- ✅ No trust required
- ✅ No selling BTC to fund bounties (NEW with MUSD)

### 5. Presentation Quality (10%)

**Demo clarity:**

- [ ] Live working demo on Mezo testnet
- [ ] Real bounty creation → PR merge → payout flow
- [ ] Video walkthrough (record for judges)
- [ ] Clear before/after comparison (USDC only vs MUSD support)

**Pitch effectiveness:**

```plaintext
Problem: Bitcoin holders can't fund OSS without selling BTC
Solution: MUSD-backed bounties maintain BTC exposure
Demo: [Show live transaction on Mezo testnet]
Traction: [Existing BountyPay metrics + hackathon results]
Vision: First Bitcoin-native automated bounty platform
```

**Supporting materials:**

- [ ] Architecture diagrams
- [ ] User flow mockups
- [ ] Smart contract documentation
- [ ] Technical integration guide
- [ ] Testnet transaction examples

---

## Bonus Points

### "Huge plus for projects that want to pursue development further"

**Our commitment:**

- ✅ Serious production intent (not just hackathon project)
- ✅ Existing codebase shows execution capability
- ✅ Clear roadmap for mainnet deployment
- ✅ Business model defined (protocol fees)
- ✅ Target market identified (Bitcoin holders + OSS)

**Post-hackathon roadmap:**

1. **Month 1-2:** Security audit, mainnet deployment (Mezo)
2. **Month 3-4:** User onboarding, partnerships (OSS projects)
3. **Month 5-6:** Advanced features (yield integration, analytics)
4. **Month 7+:** Scale to other chains, enterprise adoption

**Funding strategy:**

- Protocol fees for sustainability
- Potential grants (OSS foundations, Bitcoin ecosystem)
- VC funding if scaling rapidly

---

## Checklist by Phase

### Phase 1: Pre-Development (Before Hackathon Starts)

- [x] Existing BountyPay platform operational
- [x] Smart contracts deployed on Base Sepolia
- [ ] Team roles defined
- [ ] Development environment ready
- [ ] Mezo documentation reviewed

### Phase 2: Hackathon Period (New Work)

**Week 1: Smart Contracts**

- [ ] Fork BountyEscrow for multi-token support
- [ ] Add token parameter to all functions
- [ ] Implement supported tokens registry
- [ ] Write unit tests for MUSD flows
- [ ] Deploy to Mezo testnet
- [ ] Verify contracts on explorer

**Week 2: Backend Integration**

- [ ] Update database schema (token column)
- [ ] Modify API endpoints for token selection
- [ ] Update webhook handlers
- [ ] Test MUSD transaction monitoring
- [ ] Deploy backend to staging

**Week 3: Frontend & Testing**

- [ ] Add token selector UI
- [ ] Implement MUSD approval flow
- [ ] Network switching (Base ↔ Mezo)
- [ ] End-to-end testing on Mezo testnet
- [ ] Record demo video
- [ ] Prepare presentation

### Phase 3: Submission

- [ ] Working demo URL live
- [ ] All code committed to GitHub
- [ ] Documentation complete
- [ ] Video demo uploaded
- [ ] Presentation deck ready
- [ ] KYB documents prepared
- [ ] Submit before deadline

### Phase 4: Post-Submission

- [ ] Monitor for judge questions
- [ ] Be ready for live demo
- [ ] Prepare detailed Q&A responses
- [ ] Network with other participants
- [ ] Gather feedback

---

## Technical Requirements Checklist

### Smart Contracts

- [ ] BountyEscrow with MUSD support deployed on Mezo testnet
- [ ] FeeVault deployed on Mezo testnet
- [ ] Contracts verified on block explorer
- [ ] ABI files exported and accessible
- [ ] Test MUSD token configured
- [ ] Gas optimization review complete

### Backend

- [ ] Express server deployed and accessible
- [ ] GitHub App configured for test repo
- [ ] Webhook endpoint receiving events
- [ ] Database migrations run
- [ ] MUSD token configuration in codebase
- [ ] Environment variables documented

### Frontend

- [ ] Token selection UI component
- [ ] MUSD balance display
- [ ] Network detection (Mezo testnet)
- [ ] Wallet connection tested
- [ ] Transaction status tracking
- [ ] Error handling for MUSD flows

### Integration

- [ ] GitHub webhooks delivering to server
- [ ] Smart contract events indexed
- [ ] MUSD approvals working
- [ ] Automated payouts functioning
- [ ] Refund mechanism tested

---

## Demo Script

### 1. Introduction (1 minute)

"BountyPay automates bounty payouts for open-source contributions. Today, we're showing MUSD integration - enabling Bitcoin holders to fund bounties without selling their BTC."

### 2. Problem Statement (30 seconds)

"Bitcoin holders face a dilemma: fund OSS or hold BTC. With MUSD, they can do both - maintaining BTC exposure while sponsoring bounties."

### 3. Live Demo (3 minutes)

**Step 1: Create Bounty with MUSD**

- Open GitHub issue
- Click "Create Bounty" button
- Connect wallet (Mezo testnet)
- Select MUSD token
- Approve and fund bounty
- Show transaction on Mezo block explorer

**Step 2: Contributor Flow**

- Different user opens PR
- Links wallet (SIWE authentication)
- PR merged (simulate)
- Show automated MUSD payout
- Display transaction on explorer

**Step 3: Sponsor Benefits**

- Show sponsor's MUSD position maintained
- Compare to USDC flow (would require selling BTC)
- Highlight 1% fixed cost vs selling slippage

### 4. Technical Highlights (1 minute)

- Multi-token architecture
- Mezo network integration
- Automated webhook-driven payouts
- Security features (ReentrancyGuard, SafeERC20)

### 5. Vision & Roadmap (30 seconds)

"First Bitcoin-native automated bounty platform. Mainnet launch planned for [date]. Targeting Bitcoin-holding developers and OSS maintainers."

---

## Risk Management

### What if MUSD testnet is down?

- Plan B: Record demo in advance
- Show pre-recorded transactions
- Have screenshots ready

### What if GitHub App rate limits hit?

- Use dedicated test repository
- Pre-configure webhooks
- Have backup manual testing flow

### What if judges ask about security?

- Prepared audit plan
- OpenZeppelin best practices documented
- Security review checklist ready

### What if competing projects do similar?

- Emphasize GitHub automation differentiation
- Show existing production platform
- Highlight user adoption potential

---

## Useful Resources

### Mezo Documentation

- **Main Docs:** <https://docs.mezo.org>
- **MUSD Overview:** [What is MUSD?](https://docs.mezo.org/musd)
- **Developer Guide:** GitHub repositories
- **npm Package:** @mezo/contracts (check for testnet deployment addresses)

### Network Access

**Spectrum RPCs**

- Free premium access during hackathon
- Form: [Spectrum Access Form](https://spectrum.network/mezo-access)
- Guide: <https://spectrumnodes.gitbook.io/docs/user-guides/create-your-first-endpoint>

**Boar Network RPCs**

- Upgraded free tier for hackathon
- Access: [Boar Network User Guide](https://boarnetwork.com/mezo-guide)

### Mezo Resources

- **Roadmap:** Review for alignment
- **Supernormal Foundation:** About page
- **Blog:** Stay updated on MUSD developments
- **Community:** Discord/Telegram for tech support

---

## Success Definition

### Minimum Viable Demo

- ✅ Bounty created with MUSD on Mezo testnet
- ✅ PR merged triggers automated MUSD payout
- ✅ All transactions visible on block explorer
- ✅ Frontend shows MUSD balances correctly

### Ideal Demo

- ✅ Multiple token support (USDC + MUSD)
- ✅ Network switching working smoothly
- ✅ Refund flow demonstrated
- ✅ Analytics showing MUSD vs USDC comparison
- ✅ Video demo + live demo both ready

### Stretch Goals

- ✅ Multiple test bounties resolved
- ✅ Real community testers using platform
- ✅ Mezo team feedback incorporated
- ✅ Media/community buzz generated
- ✅ Partnership discussions initiated

---

## Submission Checklist

### Required Materials

- [ ] GitHub repository URL
- [ ] Demo URL (live frontend)
- [ ] Video demo (3-5 minutes)
- [ ] Presentation deck
- [ ] Technical documentation
- [ ] Smart contract addresses (Mezo testnet)
- [ ] KYB information

### Optional But Recommended

- [ ] Architecture diagrams
- [ ] User testimonials (if beta tested)
- [ ] Competitive analysis
- [ ] Go-to-market strategy
- [ ] Financial projections
- [ ] Team bios
- [ ] Social media presence

### Final Review

- [ ] All links working
- [ ] Demo tested on multiple devices
- [ ] Video quality acceptable
- [ ] Presentation under time limit
- [ ] Code committed and public
- [ ] README updated with Mezo integration details

---

## Contact & Support

### During Hackathon

- Mezo Discord: Technical questions
- Spectrum/Boar Support: RPC issues
- Organizer contact: Submission questions

### Team Internal

- Daily standups
- Demo rehearsals (2 days before deadline)
- Code review process
- Emergency contact plan

---

## Post-Hackathon Plan

### If we win

1. Complete KYB process immediately
2. Announce on social media
3. Begin security audit process
4. Plan mainnet deployment
5. Reach out for Mezo partnership discussions

### If we don't win

1. Gather judge feedback
2. Identify improvement areas
3. Still pursue mainnet deployment (valuable feature)
4. Use demo for user acquisition
5. Apply learnings to future iterations

### Regardless of result

- MUSD integration is production-ready feature
- Expands addressable market
- Demonstrates technical capability
- Opens Bitcoin community opportunities
- Valuable experience with Mezo ecosystem

---

**Remember:** The hackathon is a forcing function for building MUSD support. The real win is having a production-ready Bitcoin-backed bounty platform that serves a real market need.

**Timeline:** Hackathon runs [dates]. Submission deadline [specific date/time].

**Prize Pool:** $12,500 per track + potential Mezo incentives for mainnet deployment.

**Make it count.** 🚀
