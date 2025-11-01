# Troubleshooting Guide

Common issues and solutions for BountyPay.

---

## Webhook Issues

### Webhook Not Received

**Symptoms:**

- GitHub events not triggering bot actions
- No server logs for webhook deliveries
- Bot not posting comments

**Solutions:**

1. **Verify webhook URL is accessible:**

   ```bash
   curl https://your-domain.com/webhooks/github
   ```

   Should return JSON response (not 404).

2. **Check GitHub App settings:**
   - Webhook URL must exactly match: `https://your-domain.com/webhooks/github`
   - Must use HTTPS (GitHub requires SSL)
   - Webhook secret must match `GITHUB_WEBHOOK_SECRET`

3. **Check webhook deliveries:**
   - Go to GitHub App → Advanced → Webhook deliveries
   - Check delivery status and response codes
   - Redeliver failed deliveries

4. **Verify signature:**
   - Check server logs for signature verification errors
   - Ensure raw body is preserved (already handled in code)
   - Verify webhook secret matches in both places

5. **Check server logs:**

   ```bash
   # Look for webhook processing errors
   tail -f server.log | grep webhook
   ```

---

### Webhook Signature Verification Fails

**Symptoms:**

- 401 errors in webhook deliveries
- "Invalid signature" in server logs

**Solutions:**

1. **Verify webhook secret:**

   ```bash
   # In GitHub App settings, verify webhook secret
   # In .env, ensure it matches:
   echo $GITHUB_WEBHOOK_SECRET
   ```

2. **Check raw body handling:**
   - Code should preserve raw body for signature verification
   - Verify `req.rawBody` is available in webhook handler

3. **Test signature manually:**

   ```javascript
   const crypto = require('crypto');
   const signature = crypto
     .createHmac('sha256', webhookSecret)
     .update(rawBody)
     .digest('hex');
   ```

---

## Database Issues

### Database Locked

**Symptoms:**

- "SQLITE_BUSY" errors
- Database operations timing out
- Application freezes

**Solutions:**

1. **Close other connections:**

   ```bash
   # Close any open SQLite connections
   # Check for other processes using the database
   lsof server/db/bounty.db
   ```

2. **Enable WAL mode:**

   ```sql
   PRAGMA journal_mode=WAL;
   ```

   (Should already be enabled, but verify)

3. **Increase timeout:**

   ```javascript
   // In db/index.js, increase busy timeout
   db.pragma('busy_timeout = 5000');
   ```

4. **Check file permissions:**

   ```bash
   ls -la server/db/bounty.db
   # Ensure file is writable
   chmod 664 server/db/bounty.db
   ```

---

### Database Not Found

**Symptoms:**

- "Database not found" errors
- Empty query results
- Tables don't exist

**Solutions:**

1. **Run migrations:**

   ```bash
   npm run migrate
   ```

2. **Check database path:**

   ```bash
   # Verify DATABASE_PATH in .env
   echo $DATABASE_PATH
   # Or check default location
   ls -la server/db/bounty.db
   ```

3. **Recreate database:**

   ```bash
   rm server/db/bounty.db
   npm run migrate
   ```

---

### Database Corruption

**Symptoms:**

- Query errors
- Inconsistent data
- Application crashes

**Solutions:**

1. **Check integrity:**

   ```sql
   PRAGMA integrity_check;
   ```

2. **Backup and restore:**

   ```bash
   # Backup
   cp server/db/bounty.db server/db/bounty.db.backup
   
   # Try to recover
   sqlite3 server/db/bounty.db ".recover" | sqlite3 server/db/bounty-recovered.db
   ```

3. **If recovery fails, restore from backup:**

   ```bash
   cp server/db/bounty.db.backup server/db/bounty.db
   ```

---

## Blockchain Issues

### Transaction Reverted

**Symptoms:**

- Contract calls fail
- "Transaction reverted" errors
- Gas estimation fails

**Solutions:**

1. **Check contract state:**

   ```javascript
   const bounty = await contract.getBounty(bountyId);
   console.log(bounty.status); // Must be Open (1)
   ```

2. **Verify parameters:**
   - Check all addresses are valid (not zero)
   - Verify amounts are correct
   - Ensure deadline is in future (for create)

3. **Check permissions:**
   - Ensure caller is sponsor (for cancel/refund)
   - Ensure caller is resolver (for resolve)
   - Verify USDC approval (for create/fund)

4. **Check contract pause status:**

   ```javascript
   const paused = await contract.paused();
   // Contract should not be paused
   ```

---

### Out of Gas

**Symptoms:**

- Transaction fails with "out of gas"
- Gas estimation returns very high values

**Solutions:**

1. **Increase gas limit:**

   ```javascript
   const tx = await contract.createBounty(..., {
     gasLimit: 300000 // Increase from default
   });
   ```

2. **Check network:**
   - Ensure connected to Base Sepolia (Chain ID 84532)
   - Verify RPC endpoint is correct

3. **Check resolver balance:**

   ```javascript
   const balance = await provider.getBalance(resolverAddress);
   console.log('Resolver balance:', ethers.formatEther(balance));
   // Should have enough for gas
   ```

---

### Network Connection Issues

**Symptoms:**

- "Network error" messages
- RPC calls timeout
- Cannot connect to blockchain

**Solutions:**

1. **Verify RPC URL:**

   ```bash
   # Check RPC_URL in .env
   echo $RPC_URL
   # Should be: https://sepolia.base.org
   ```

2. **Test RPC connection:**

   ```bash
   curl -X POST https://sepolia.base.org \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

3. **Try alternative RPC:**

   ```bash
   # Add to .env
   RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY
   ```

4. **Check rate limiting:**
   - Free RPC endpoints may have rate limits
   - Consider using a paid RPC provider (Alchemy, Infura)

---

## Authentication Issues

### SIWE Verification Fails

**Symptoms:**

- "Invalid signature" errors
- Wallet not authenticated
- Cannot link wallet

**Solutions:**

1. **Verify message format:**

   ```javascript
   // Message must match SIWE format exactly
   const message = `your-domain.com wants you to sign in...
   URI: https://your-domain.com
   ...
   Nonce: ${nonce}`;
   ```

2. **Check nonce freshness:**
   - Nonce should be recent (within session timeout)
   - Don't reuse nonces

3. **Verify chain ID:**

   ```javascript
   // Must match Base Sepolia (84532)
   const chainId = await provider.getNetwork();
   console.log(chainId.chainId); // Should be 84532n
   ```

4. **Check session:**

   ```javascript
   // Verify session is maintained
   // Check cookies are set and sent
   ```

---

### OAuth Callback Fails

**Symptoms:**

- GitHub OAuth redirect fails
- "Invalid state" errors
- User not authenticated

**Solutions:**

1. **Verify callback URL:**
   - Must exactly match GitHub App settings
   - Must use HTTPS (except localhost)
   - Check `FRONTEND_URL` in .env

2. **Check state parameter:**
   - State must match session ID
   - Ensure session is created before OAuth

3. **Verify client credentials:**

   ```bash
   # Check in .env
   echo $GITHUB_CLIENT_ID
   echo $GITHUB_CLIENT_SECRET
   ```

4. **Check redirect URI:**
   - Must match in GitHub App → OAuth settings
   - Case-sensitive

---

### Session Not Persisting

**Symptoms:**

- User logged out after refresh
- Session lost
- Authentication fails intermittently

**Solutions:**

1. **Check cookie settings:**

   ```javascript
   // In server/index.js, verify:
   cookie: {
     secure: true, // true in production (HTTPS required)
     httpOnly: true,
     sameSite: 'lax'
   }
   ```

2. **Verify SESSION_SECRET:**

   ```bash
   # Should be set and consistent
   echo $SESSION_SECRET
   ```

3. **Check CORS:**
   - Ensure CORS origin matches frontend URL
   - Verify credentials are sent with requests

4. **Check browser:**
   - Cookies enabled?
   - Third-party cookies blocked?
   - Incognito mode issues?

---

## GitHub App Issues

### Bot Not Responding

**Symptoms:**

- No comments posted on issues
- Bot doesn't react to events
- GitHub App appears inactive

**Solutions:**

1. **Verify app installation:**
   - Check GitHub App is installed on repository
   - Verify installation has correct permissions

2. **Check app permissions:**
   - Issues: Read and write
   - Pull requests: Read and write
   - Metadata: Read-only

3. **Verify webhook events:**
   - Issues event subscribed
   - Pull request event subscribed

4. **Check installation ID:**
   - Verify installation ID is correct
   - Check app has access to repository

---

### App Installation Fails

**Symptoms:**

- Cannot install GitHub App
- Permission denied errors
- Installation button doesn't work

**Solutions:**

1. **Check repository permissions:**
   - Must be admin or owner
   - Organization apps require org admin

2. **Verify app settings:**
   - App must allow installation on target account
   - Check "Where can this GitHub App be installed?"

3. **Check organization settings:**
   - Organization may restrict third-party apps
   - May need approval from org owner

---

## Environment Variable Issues

### Missing Environment Variables

**Symptoms:**

- Server crashes on startup
- "Missing required config" errors
- Application doesn't start

**Solutions:**

1. **Verify .env file:**

   ```bash
   # Check file exists
   ls -la .env
   
   # Verify variables are set
   cat .env | grep -v "^#"
   ```

2. **Check required variables:**

   ```bash
   # From server/config.js
   SESSION_SECRET
   GITHUB_APP_ID
   GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH
   GITHUB_WEBHOOK_SECRET
   GITHUB_CLIENT_ID
   GITHUB_CLIENT_SECRET
   ESCROW_CONTRACT
   RESOLVER_PRIVATE_KEY
   ```

3. **Verify private key:**

   ```bash
   # If using file path
   ls -la $GITHUB_PRIVATE_KEY_PATH
   
   # If using inline, verify format
   echo $GITHUB_PRIVATE_KEY | head -c 50
   ```

---

### Invalid Environment Variables

**Symptoms:**

- Configuration errors
- Invalid values
- Type mismatches

**Solutions:**

1. **Check variable formats:**

   ```bash
   # Chain ID must be number
   echo $CHAIN_ID # Should be 84532
   
   # Addresses must be valid hex
   echo $ESCROW_CONTRACT # Should start with 0x
   ```

2. **Verify private keys:**

   ```bash
   # Resolver private key format
   # Can be with or without 0x prefix
   echo $RESOLVER_PRIVATE_KEY | wc -c # Should be 64 or 66 chars
   ```

3. **Check URLs:**

   ```bash
   # Must be valid URLs
   echo $RPC_URL
   echo $FRONTEND_URL
   ```

---

## Frontend Issues

### Wallet Not Connecting

**Symptoms:**

- MetaMask doesn't connect
- "Please install MetaMask" errors
- Wrong network

**Solutions:**

1. **Check MetaMask installed:**

   ```javascript
   if (typeof window.ethereum === 'undefined') {
     // Show install MetaMask message
   }
   ```

2. **Verify network:**

   ```javascript
   // Should be Base Sepolia (Chain ID 84532)
   const chainId = await provider.getNetwork();
   if (chainId.chainId !== 84532n) {
     // Prompt to switch network
   }
   ```

3. **Add network if missing:**

   ```javascript
   await window.ethereum.request({
     method: 'wallet_addEthereumChain',
     params: [{
       chainId: '0x14a34', // 84532 in hex
       chainName: 'Base Sepolia',
       rpcUrls: ['https://sepolia.base.org'],
       nativeCurrency: {
         name: 'ETH',
         symbol: 'ETH',
         decimals: 18
       }
     }]
   });
   ```

---

### Transaction Fails in Frontend

**Symptoms:**

- Transaction rejected
- User declines transaction
- Transaction stuck

**Solutions:**

1. **Check user approval:**
   - User must approve transaction in MetaMask
   - Check for transaction rejection

2. **Verify gas:**

   ```javascript
   // Increase gas limit if needed
   const tx = await contract.createBounty(..., {
     gasLimit: 300000
   });
   ```

3. **Check USDC balance:**

   ```javascript
   const balance = await usdcContract.balanceOf(userAddress);
   // Must be >= amount + gas
   ```

4. **Verify approval:**

   ```javascript
   const allowance = await usdcContract.allowance(
     userAddress,
     escrowAddress
   );
   // Must be >= amount
   ```

---

## General Issues

### Server Not Starting

**Solutions:**

1. **Check Node.js version:**

   ```bash
   node --version # Should be 18+
   ```

2. **Verify dependencies:**

   ```bash
   npm install
   ```

3. **Check port availability:**

   ```bash
   lsof -ti:3000
   # Kill if needed
   ```

4. **Check logs:**

   ```bash
   npm start
   # Look for error messages
   ```

---

### Performance Issues

**Symptoms:**

- Slow responses
- Timeouts
- High memory usage

**Solutions:**

1. **Database optimization:**

   ```sql
   -- Ensure indexes exist
   PRAGMA index_list('bounties');
   ```

2. **Check database size:**

   ```bash
   ls -lh server/db/bounty.db
   # Consider migrating to PostgreSQL if large
   ```

3. **Monitor resources:**
   - Check CPU/memory usage
   - Consider scaling horizontally

---

## Getting Help

If you can't resolve an issue:

1. **Check logs:**
   - Server logs
   - Browser console
   - GitHub webhook deliveries

2. **Search issues:**
   - [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)

3. **Provide details:**
   - Error messages
   - Steps to reproduce
   - Environment details

---

## Next Steps

- [FAQ](faq.md) - Frequently asked questions
- [Local Development](local-development.md) - Setup guide
- [API Documentation](api.md) - API reference
