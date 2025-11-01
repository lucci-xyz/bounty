# <img src="public/icons/og.png" alt="BountyPay logo" width="50" style="vertical-align:middle;" /> BountyPay

_Automated, trust-minimised bounty payouts for open-source contributions. Fund with USDC on Base or MUSD on Mezo and let BountyPay handle the rest._



## Get Started in Minutes

1. **Install the GitHub App**  
   👉 [Download BountyPay](https://github.com/apps/bountypay)

2. **Open a New Issue** and click the ``` Create a bounty ``` button from the BountyPay bot.

3. **Choose Your Network & Fund**
   - **Base Sepolia**: Fund with USDC (EVM standard)
   - **Mezo Testnet**: Fund with MUSD (Bitcoin L2)
   
   Funds sit safely in escrow.

4. **Merge the winning PR** — BountyPay automatically pays the contributor once the PR closes the issue.

That's it. No invoices, no manual transfers, no spreadsheets.

## Contributing

We love hearing from builders and maintainers.

- Open ideas or bugs via [Issues](https://github.com/lucci-xyz/bounty/issues)  
- Join discussions on new workflows or integrations  
- Submit PRs — we’ll review quickly and shout you out in the release notes

### High-Impact Ideas

- **Anti-griefing guardrails** – Prevent sponsors from copying the flow and cancelling bounties after seeing the code. Ideas welcomed: reputation, deposits, social recovery.  
- **Mezo Passport Integration** – Add native Bitcoin wallet support (Unisat, Leather) alongside EVM wallets for Mezo bounties.  
- **Multi-asset support** – Accept deposits in any token, on any Base or L2 network, and settle in the contributor's preferred asset.  
- **Proof-of-work collectibles** – Mint contribution NFTs as on-chain receipts for completed bounties.  
- **Security & audits** – Help us continuously audit contracts, bot logic, and wallet flows.  
- **New bounty mechanics** – Milestone-based unlocks, recurring grants, or team-based rewards. Surprise us.

---

## Smart Contracts

Deployed on **Base Sepolia (Chain ID 84532)**.

| Contract | Address |
|----------|---------|
| BountyEscrow | `0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD` |
| FeeVault | `0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3` |
| USDC (Test) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

Deployed on **Mezo Testnet (Chain ID 31611)**.

| Contract | Address |
|----------|---------|
| BountyEscrow | `0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3` |
| FeeVault | `0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094` |
| MUSDC (Test) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |


Audit reports and deployment history are coming soon.

---

Built with ❤️ using Base and Mezo.

_**Use at your own risk.** BountyPay is provided "as is" without warranties. You are responsible for the funds you deposit and the security practices you follow._