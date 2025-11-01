# Testing & Environments

Short and sweet: here’s how to push changes through staging and production.

---

## Stage

1. **Open Railway** and switch to the `stage` environment.  
2. In **Settings**, set the branch you want to test to the correct branch.  
3. Make sure your branch is up to date, then trigger a deploy.  
4. Test the flow in this sandbox repo: [lucci-xyz/bounty-test-stage](https://github.com/lucci-xyz/bounty-test-stage).  
5. Reminder: staging uses the private GitHub App **BountyPay-STAGE**.

---

## Production

1. Merge your pull request into `main`.  
2. Deployment runs automatically via Railway.  
3. Validate with the production sandbox repo: [lucci-xyz/bounty-test](https://github.com/lucci-xyz/bounty-test).  
4. Production traffic runs through the primary GitHub App **BountyPay**.

---

Happy testing, and shout if you spot anything we can streamline.  
