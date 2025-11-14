# Testing & Environments

Short and sweet: here's how to push changes through staging and production.

---

## Stage

1. **Open Vercel** and create a preview deployment from your branch.  
2. Push to your feature branch - Vercel automatically creates a preview deployment.  
3. Get the preview URL from Vercel dashboard or GitHub PR comments.  
4. Test the flow in this sandbox repo: [lucci-xyz/bounty-test-stage](https://github.com/lucci-xyz/bounty-test-stage).  
5. Reminder: staging uses the private GitHub App **BountyPay-STAGE**.

---

## Production

1. Merge your pull request into `main`.  
2. Deployment runs automatically via Vercel to production.  
3. Validate with the production sandbox repo: [lucci-xyz/bounty-test](https://github.com/lucci-xyz/bounty-test).  
4. Production traffic runs through the primary GitHub App **BountyPay**.

---

## Vercel Preview Deployments

Each pull request automatically gets:
- Unique preview URL
- Full environment with all features
- Comment on PR with deployment link
- Independent from production

---

Happy testing, and shout if you spot anything we can streamline.  
