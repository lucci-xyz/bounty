# Deployment Checklist for Mezo Integration

## Pre-Deployment

### 1. Environment Variables
Ensure these are set in your production environment:

```bash
# Existing (keep these)
SESSION_SECRET=...
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
RESOLVER_PRIVATE_KEY=...

# Optional: Custom network configs (defaults are provided)
BASE_RPC_URL=https://sepolia.base.org
BASE_ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
BASE_USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e

MEZO_RPC_URL=https://rpc.test.mezo.org
MEZO_ESCROW_CONTRACT=0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3
MEZO_MUSD_CONTRACT=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

### 2. Database Migration

The schema has been updated automatically via `server/db/schema.js`. For existing databases:

```bash
# Backup first!
cp server/db/bounty.db server/db/bounty.db.backup

# Schema will auto-update on next server start
# New columns have defaults: network='base', chain_id=84532
```

### 3. Verify Contract Deployments

**Base Sepolia:**
```bash
# Check escrow contract is accessible
curl https://sepolia.base.org \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD","latest"],"id":1}'
```

**Mezo Testnet:**
```bash
# Check escrow contract is accessible
curl https://rpc.test.mezo.org \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3","latest"],"id":1}'
```

### 4. Resolver Wallet Funding

Ensure the resolver wallet has gas on **both networks**:

**Base Sepolia:**
- Need ETH for gas
- Get from: https://www.alchemy.com/faucets/base-sepolia

**Mezo Testnet:**
- Need BTC for gas (Mezo uses BTC as native currency)
- Bridge testnet BTC to Mezo

Check balances:
```javascript
// In node console
import { getResolverWallet } from './server/blockchain/contract.js';
const baseWallet = getResolverWallet('base');
const mezoWallet = getResolverWallet('mezo');
console.log('Base balance:', await baseWallet.provider.getBalance(baseWallet.address));
console.log('Mezo balance:', await mezoWallet.provider.getBalance(mezoWallet.address));
```

## Deployment Steps

### 1. Deploy Code

```bash
# Pull latest changes
git pull origin 16-integrate-mezo

# Install dependencies (no new dependencies needed for vanilla JS approach)
npm install

# Run tests (if you have them)
npm test
```

### 2. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

### 3. Verify Initialization

Check logs for successful initialization:
```
🔗 Initializing blockchain connections...

✅ Base Sepolia initialized
   Resolver address: 0x...
   Escrow contract: 0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
   Token (USDC): 0x036CbD53842c5426634e7929541eC2318f3dCF7e

✅ Mezo Testnet initialized
   Resolver address: 0x...
   Escrow contract: 0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3
   Token (MUSD): 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
```

## Post-Deployment Testing

### 1. API Health Checks

```bash
# Check networks endpoint
curl http://localhost:3000/api/networks

# Should return both network configs
```

### 2. Create Test Bounty on Mezo

1. Open test GitHub issue
2. Click "Create a bounty" button
3. Select **Mezo Testnet**
4. Connect wallet
5. Enter small amount (e.g., 10 MUSD)
6. Complete transaction
7. Verify GitHub comment shows "MUSD on Mezo Testnet"

### 3. Verify Database

```bash
sqlite3 server/db/bounty.db "SELECT bounty_id, network, chain_id, amount FROM bounties ORDER BY created_at DESC LIMIT 5;"
```

Should show:
- Existing bounties with `network='base'`, `chain_id=84532`
- New bounty with `network='mezo'`, `chain_id=31611`

### 4. Test Full Flow

**On Mezo:**
1. Create bounty with MUSD
2. Open PR that closes issue
3. Link wallet (if not already linked)
4. Merge PR
5. Verify automatic payout occurs
6. Check GitHub comments show Mezo explorer link
7. Verify recipient received MUSD on Mezo

**On Base (regression test):**
1. Create bounty with USDC
2. Complete same flow
3. Verify nothing broke

## Rollback Plan

If issues occur:

### 1. Quick Rollback (Disable Mezo Only)

Edit `server/blockchain/contract.js`:
```javascript
export function initBlockchain() {
  console.log('🔗 Initializing blockchain connections...\n');
  
  // Initialize Base Sepolia only
  initNetworkConnection('base');
  
  // Comment out Mezo initialization
  // initNetworkConnection('mezo');
  
  console.log('');
}
```

Frontend will still show Mezo option, but bounties will fail gracefully.

### 2. Full Rollback (Git)

```bash
# Restore previous version
git checkout main
npm install
npm start
```

Database is backward compatible - old code will ignore new columns.

### 3. Database Rollback (if needed)

```bash
# Restore backup
cp server/db/bounty.db.backup server/db/bounty.db

# Or drop new columns (SQLite limitation: requires table recreation)
```

## Monitoring

### Key Metrics to Watch

1. **Bounty Creation Success Rate**
   - Track failed transactions on each network
   - Monitor for network-specific issues

2. **Resolution Success Rate**
   - Ensure resolver has sufficient gas on both networks
   - Monitor for contract interaction failures

3. **Error Logs**
   - Watch for network connection issues
   - Monitor RPC rate limits

4. **GitHub Integration**
   - Verify comments are posted correctly
   - Check network information is accurate

### Alerts to Set Up

- [ ] Resolver wallet balance low (<0.1 ETH on Base, <0.01 BTC on Mezo)
- [ ] Network RPC failures
- [ ] Failed bounty resolutions
- [ ] Database write errors

## Common Issues

### Issue: "Network not initialized"
**Cause**: Server started before network connection established
**Fix**: Restart server, check RPC URLs are accessible

### Issue: Transaction fails on Mezo
**Cause**: Insufficient gas (BTC) or incorrect gas estimation
**Fix**: 
- Ensure resolver wallet has BTC
- May need to adjust gas limits in frontend

### Issue: Wrong token decimals displayed
**Cause**: Frontend showing wrong network config
**Fix**: Clear browser cache, verify network selection

### Issue: GitHub comments show wrong network
**Cause**: Database has wrong `network` value
**Fix**: Update database entry manually

## Support Resources

- **Mezo Docs**: `docs/mezo/`
- **Integration Guide**: `docs/MEZO_INTEGRATION.md`
- **Mezo Discord**: https://discord.com/invite/mezo
- **Mezo Explorer**: https://explorer.test.mezo.org

## Sign-Off Checklist

Before considering deployment complete:

- [ ] Both networks initialize successfully
- [ ] Test bounty created on Mezo
- [ ] Test bounty created on Base (regression)
- [ ] Wallet linking works on both networks
- [ ] Bounty resolution works on Mezo
- [ ] GitHub comments show correct network info
- [ ] Block explorer links work for both networks
- [ ] Resolver wallet funded on both networks
- [ ] Monitoring/alerts configured
- [ ] Team trained on new features
- [ ] Documentation updated
- [ ] Rollback plan tested

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Sign-Off**: _______________

