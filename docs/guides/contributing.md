# Contributing to BountyPay

We love hearing from builders and maintainers. This guide will help you get started with contributing to BountyPay.

---

## Ways to Contribute

### Report Bugs and Issues

Found a bug? Have a feature request?

- Open issues via [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)
- Provide clear reproduction steps
- Include screenshots or error messages
- Tag with appropriate labels

### Submit Pull Requests

Want to fix a bug or add a feature?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Submit a PR with clear description
6. We'll review quickly and shout you out in the release notes

### Join Discussions

- Discuss new workflows or integrations
- Share ideas for improvements
- Help other users in discussions
- Provide feedback on proposed features

---

## High-Impact Ideas

Looking for something impactful to work on? Here are some areas we'd love help with:

### 1. Anti-Griefing Guardrails

**Problem:** Prevent sponsors from copying the code and cancelling bounties after seeing the solution.

**Ideas Welcomed:**
- Reputation systems
- Deposit requirements
- Social recovery mechanisms
- Staking/slashing models
- Time-locked reveals

### 2. Mezo Passport Integration

**Goal:** Add native Bitcoin wallet support alongside EVM wallets for Mezo bounties.

**Wallets to Support:**
- Unisat
- Leather
- Xverse
- OKX Wallet

**Requirements:**
- Bitcoin signature verification
- Smooth wallet switching
- Maintain existing EVM wallet support

### 3. Multi-Asset Support

**Goal:** Accept deposits in any token, on any Base or L2 network, and settle in contributor's preferred asset.

**Features:**
- Token swaps on deposit
- Cross-chain bounties
- Automatic token conversion
- Unified liquidity management

### 4. Proof-of-Work Collectibles

**Goal:** Mint contribution NFTs as on-chain receipts for completed bounties.

**Features:**
- NFT minted when bounty resolves
- Contains bounty metadata (repo, issue, amount)
- Transferable proof of contribution
- Optional: Rarity based on bounty size

### 5. Security & Audits

**Critical Area:** Help us continuously audit contracts, bot logic, and wallet flows.

**Areas to Review:**
- Smart contract security
- Frontend wallet integration
- Backend API security
- Database query safety
- SIWE authentication flow

### 6. New Bounty Mechanics

**Goal:** Expand beyond simple one-time bounties.

**Ideas:**
- Milestone-based unlocks
- Recurring grants for maintenance
- Team-based rewards with split payments
- Proportional payouts for multiple contributors
- Bounty pools for related issues

**Surprise us with your own ideas!**

---

## Development Setup

See our [Local Development Guide](../development/local-development.md) for detailed setup instructions.

Quick start:

```bash
# Clone the repository
git clone https://github.com/lucci-xyz/bounty.git
cd bounty

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
npm run migrate

# Start development server
npm run dev

# In another terminal, start frontend
npm run dev:client
```

---

## Coding Standards

### Style Guide

- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Testing

- Write tests for new features
- Ensure existing tests pass
- Run `npm test` before submitting PR
- Aim for >80% code coverage

### Documentation

- Update README if adding user-facing features
- Add JSDoc comments for public APIs
- Update relevant documentation in `docs/`
- Include examples where helpful

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, focused commits
   - Add tests for new functionality
   - Update documentation

3. **Test thoroughly:**
   ```bash
   npm test
   npm run build
   ```

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add multi-token support for bounties"
   ```

### Submitting Your PR

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request:**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what you changed and why
   - Include screenshots for UI changes
   - List any breaking changes

3. **Respond to feedback:**
   - Address review comments promptly
   - Push additional commits to your branch
   - Discuss any disagreements constructively

### PR Review Criteria

We'll review your PR based on:

- **Functionality:** Does it work as intended?
- **Code Quality:** Is it clean and maintainable?
- **Tests:** Are there adequate tests?
- **Documentation:** Is it properly documented?
- **Security:** Are there any vulnerabilities?

---

## Issue Labels

We use labels to organize and prioritize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `security` - Security-related issues
- `performance` - Performance improvements
- `question` - Questions or discussions

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

---

## Recognition

Contributors who submit merged PRs will be:

- Shouted out in release notes
- Added to CONTRIBUTORS.md
- Eligible for contributor bounties (coming soon)

---

## Questions?

- 💬 Open a discussion on GitHub
- 📖 Read the [FAQ](../support/faq.md)
- 🐛 Report issues on [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)

---

Thank you for contributing to BountyPay! 🎉
