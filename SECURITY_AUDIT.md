# Security Audit Report - BountyPay

**Date:** 2025-11-16  
**Auditor:** GitHub Copilot  
**Scope:** Complete codebase security audit  
**Version:** 1.0.0

## Executive Summary

This security audit identified **multiple security vulnerabilities** in the BountyPay application, ranging from **CRITICAL** to **LOW** severity. The application handles sensitive operations including blockchain transactions, GitHub OAuth, and user authentication, making security paramount.

### Risk Summary
- **CRITICAL:** 1 finding
- **HIGH:** 2 findings  
- **MEDIUM:** 3 findings
- **LOW:** 2 findings
- **INFORMATIONAL:** 3 findings

---

## Critical Findings

### 🔴 C-1: Weak Random Number Generation for Security-Critical Operations

**Severity:** CRITICAL  
**Location:** `server/auth/siwe.js`, `app/api/oauth/github/route.js`  
**CWE:** CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)

**Description:**  
The application uses `Math.random()` to generate security-critical values:
1. SIWE nonces for wallet authentication
2. OAuth state parameters for CSRF protection

`Math.random()` is not cryptographically secure and can be predicted by attackers, leading to:
- **SIWE Replay Attacks:** Attackers can predict nonces and replay authentication requests
- **OAuth CSRF Attacks:** Attackers can forge state parameters to bypass CSRF protection

**Affected Code:**
```javascript
// server/auth/siwe.js:8
export function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// app/api/oauth/github/route.js:19
state: Math.random().toString(36).substring(7)
```

**Impact:**
- Attackers can compromise wallet linking
- OAuth flow vulnerable to CSRF attacks
- Unauthorized access to user accounts

**Recommendation:**  
Replace with cryptographically secure random generation using Node.js `crypto` module:
```javascript
import { randomBytes } from 'crypto';

export function generateNonce() {
  return randomBytes(16).toString('hex');
}
```

---

## High Severity Findings

### 🟠 H-1: Dependency Vulnerability - js-yaml Prototype Pollution

**Severity:** HIGH  
**Location:** `package.json` (transitive dependency)  
**CVE:** GHSA-mh29-5h37-fv8m  
**CVSS:** 5.3 (Medium, but HIGH in this context)

**Description:**  
The application has a vulnerable version of `js-yaml` (<4.1.1) with a known prototype pollution vulnerability in the merge operator. While this is a transitive dependency (likely from markdownlint-cli), prototype pollution can lead to:
- Remote Code Execution (RCE)
- Authentication bypass
- Property injection attacks

**Affected Package:**
```
js-yaml <4.1.1 (transitive via markdownlint-cli)
```

**Impact:**
- Potential for remote code execution
- Application stability issues
- Data corruption or unauthorized access

**Recommendation:**
```bash
npm audit fix
```
This will upgrade the vulnerable dependency to a patched version.

---

### 🟠 H-2: Missing Rate Limiting on API Endpoints

**Severity:** HIGH  
**Location:** All API routes in `app/api/`  

**Description:**  
The application has no rate limiting implemented on API endpoints, making it vulnerable to:
- Denial of Service (DoS) attacks
- Brute force attacks on authentication
- Resource exhaustion
- Excessive database queries
- Blockchain spam attacks

**Critical Endpoints Without Rate Limiting:**
- `/api/nonce` - Can be spammed to exhaust session storage
- `/api/verify-wallet` - Can be brute-forced
- `/api/bounty/create` - Can be used to spam the system
- `/api/webhooks/github` - Can be flooded (though signature protected)

**Impact:**
- Service disruption
- Increased infrastructure costs
- Database overload
- Poor user experience

**Recommendation:**  
Implement rate limiting using a middleware solution:
1. Add `express-rate-limit` or similar for Next.js API routes
2. Implement per-IP and per-user limits
3. Add exponential backoff for failed authentication attempts
4. Consider using Redis for distributed rate limiting in production

Example implementation:
```javascript
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Medium Severity Findings

### 🟡 M-1: Missing Input Validation on Contract Interaction Parameters

**Severity:** MEDIUM  
**Location:** `server/blockchain/contract.js`

**Description:**  
The contract interaction functions accept user input without sufficient validation:
- No validation of address checksums
- No validation of bountyId format
- No validation of amount ranges
- Missing zero-address checks in some functions

**Example:**
```javascript
// server/blockchain/contract.js:105
export async function resolveBounty(bountyId, recipientAddress) {
  // No validation of recipientAddress format
  // No validation of bountyId format
  const tx = await escrowContract.resolve(bountyId, recipientAddress);
}
```

**Impact:**
- Failed transactions due to invalid input
- Gas waste
- Poor user experience
- Potential contract interaction failures

**Recommendation:**
Add comprehensive input validation:
```javascript
import { isAddress, getAddress } from 'ethers';

export async function resolveBounty(bountyId, recipientAddress) {
  // Validate address
  if (!isAddress(recipientAddress)) {
    throw new Error('Invalid recipient address');
  }
  
  // Normalize to checksum address
  recipientAddress = getAddress(recipientAddress);
  
  // Validate bountyId format (should be bytes32)
  if (!/^0x[a-fA-F0-9]{64}$/.test(bountyId)) {
    throw new Error('Invalid bounty ID format');
  }
  
  // ... proceed with transaction
}
```

---

### 🟡 M-2: Session Cookie Security Configuration Issues

**Severity:** MEDIUM  
**Location:** `lib/session.js`

**Description:**  
While the session configuration is generally secure, there are potential issues:
1. **Conditional Secure Flag:** The `secure` flag is conditionally set based on `FRONTEND_URL` instead of always being true in production
2. **SameSite=Lax:** Using `lax` instead of `strict` may allow some CSRF vectors
3. **Short Max-Age:** 24-hour session timeout may be too short for some use cases but could be intentional

**Current Code:**
```javascript
const isSecure = () => {
  const frontendUrl = process.env.FRONTEND_URL || '';
  return frontendUrl.startsWith('https://') || process.env.NODE_ENV === 'production';
};
```

**Issues:**
- If `FRONTEND_URL` is misconfigured in production, cookies won't be secure
- CSRF protection could be stronger with `strict` sameSite

**Impact:**
- Potential session hijacking if served over HTTP
- Limited CSRF protection
- Man-in-the-middle attacks

**Recommendation:**
```javascript
const isSecure = () => {
  // Always secure in production, regardless of FRONTEND_URL
  if (process.env.NODE_ENV === 'production') return true;
  
  // In development, check FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || '';
  return frontendUrl.startsWith('https://');
};

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'bountypay_session',
  cookieOptions: {
    secure: isSecure(),
    httpOnly: true,
    sameSite: 'strict', // Changed from 'lax' for stronger CSRF protection
    path: '/',
    maxAge: 24 * 60 * 60,
    ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
  },
};
```

---

### 🟡 M-3: Missing Security Headers

**Severity:** MEDIUM  
**Location:** `next.config.js`

**Description:**  
The Next.js configuration does not set security headers, leaving the application vulnerable to various attacks:
- **Missing CSP:** No Content Security Policy to prevent XSS
- **Missing X-Frame-Options:** Vulnerable to clickjacking
- **Missing X-Content-Type-Options:** Vulnerable to MIME-type sniffing
- **Missing Referrer-Policy:** May leak sensitive URLs
- **Missing Permissions-Policy:** No restrictions on browser features

**Impact:**
- Cross-Site Scripting (XSS) attacks
- Clickjacking attacks
- MIME-type confusion attacks
- Information leakage through referrer

**Recommendation:**  
Add security headers in `next.config.js`:
```javascript
const nextConfig = {
  // ... existing config
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://sepolia.base.org https://rpc.test.mezo.org https://api.github.com;"
          }
        ],
      },
    ];
  },
};
```

---

## Low Severity Findings

### 🔵 L-1: Error Messages Leak Implementation Details

**Severity:** LOW  
**Location:** Multiple API routes

**Description:**  
Several API endpoints return detailed error messages that leak implementation details:

```javascript
// app/api/bounty/create/route.js:114
return Response.json({ error: error.message }, { status: 500 });
```

**Impact:**
- Information disclosure about internal structure
- Helps attackers understand the system
- May reveal file paths, function names, etc.

**Recommendation:**  
Implement generic error messages for production:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

return Response.json({ 
  error: isDevelopment ? error.message : 'An error occurred' 
}, { status: 500 });
```

---

### 🔵 L-2: Private Key Loaded from File System

**Severity:** LOW  
**Location:** `server/config.js:10-20`

**Description:**  
The GitHub private key can be loaded from the file system using `GITHUB_PRIVATE_KEY_PATH`. While this is a common pattern, it has risks:
- File permissions issues
- Path traversal if not validated
- Keys exposed in file system backups

**Recommendation:**  
1. Document the security requirements for this file
2. Add validation to ensure the path is within expected directories
3. Recommend using environment variables or secret management services (AWS Secrets Manager, HashiCorp Vault) instead

---

## Informational Findings

### ℹ️ I-1: Missing Security Documentation

**Severity:** INFORMATIONAL

**Description:**  
The repository lacks comprehensive security documentation including:
- Responsible disclosure policy
- Security best practices for contributors
- Incident response procedures
- Security architecture documentation

**Recommendation:**  
Create `SECURITY.md` with:
- Security policy
- How to report vulnerabilities
- Expected response time
- Supported versions

---

### ℹ️ I-2: No Automated Security Scanning in CI/CD

**Severity:** INFORMATIONAL

**Description:**  
The repository has no GitHub Actions workflows for:
- CodeQL security scanning
- Dependabot for automated dependency updates
- npm audit in CI/CD pipeline
- Smart contract security scanning

**Recommendation:**  
Set up GitHub Actions workflows:
1. Enable CodeQL analysis
2. Enable Dependabot security updates
3. Add npm audit to CI/CD
4. Consider adding Slither for Solidity contract analysis

---

### ℹ️ I-3: Database Query Safety

**Severity:** INFORMATIONAL  
**Location:** `server/db/prisma.js`

**Description:**  
The application uses Prisma ORM which provides good protection against SQL injection. However, there is one raw query using `$queryRaw`:

```javascript
// server/db/prisma.js:388
const tokenStats = await prisma.$queryRaw`
  SELECT 
    token,
    COUNT(*)::int as count,
    ...
  FROM bounties
  WHERE environment = ${environment}
  GROUP BY token
`;
```

**Status:** ✅ SAFE - Uses parameterized queries via tagged template literals

**Note:**  
Prisma's `$queryRaw` with tagged templates automatically parameterizes values, protecting against SQL injection. This is the correct usage pattern.

---

## Smart Contract Security Analysis

### Smart Contract: BountyEscrow.sol

**Overall Assessment:** The smart contract demonstrates good security practices with the following strengths:

✅ **Strengths:**
1. Uses OpenZeppelin 5.0.2 (pinned version) for battle-tested implementations
2. Implements ReentrancyGuard on all state-changing functions
3. Pausable pattern for emergency stops
4. Proper access control with Ownable
5. SafeERC20 for token transfers
6. Comprehensive event logging
7. Clear state machine for bounty lifecycle
8. Bounded fee with MAX_FEE_BPS constant
9. No use of `delegatecall` or `selfdestruct`
10. Proper validation and zero-address checks

⚠️ **Recommendations:**
1. Consider formal verification for critical functions
2. Add emergency withdrawal function for owner
3. Consider implementing a timelock for critical parameter changes
4. Add more comprehensive natspec documentation for security properties
5. Consider adding a bug bounty program

**Note:** The smart contract code appears to be production-ready but should undergo professional audit by firms like Trail of Bits, Consensys Diligence, or OpenZeppelin before mainnet deployment.

---

## Prisma Schema Security

**Location:** `prisma/schema.prisma`

**Assessment:** ✅ Generally secure with proper practices:

**Strengths:**
1. Uses BigInt for IDs from external systems (prevents overflow)
2. Proper indexing for query performance
3. Unique constraints prevent duplicate data
4. Cascading deletes properly configured
5. Uses environment variables for database connection

**Recommendations:**
1. Consider adding row-level security if using PostgreSQL
2. Implement database-level audit logging
3. Add database user with minimal required permissions
4. Consider encrypting sensitive fields (email, wallet addresses)

---

## Authentication & Authorization

### SIWE (Sign-In With Ethereum)

**Implementation:** `server/auth/siwe.js`

**Issues:**
- ❌ Uses weak random for nonce generation (CRITICAL - see C-1)

**Strengths:**
- ✅ Uses official `siwe` library
- ✅ Proper signature verification
- ✅ Domain validation
- ✅ Nonce stored in session

### GitHub OAuth

**Implementation:** `app/api/oauth/`

**Issues:**
- ❌ Weak random for state parameter (CRITICAL - see C-1)

**Strengths:**
- ✅ State parameter for CSRF protection (once random is fixed)
- ✅ Proper token exchange flow
- ✅ Secure credential storage in session
- ✅ Access token not exposed to client

---

## Configuration Security

### Environment Variables

**Assessment:** ✅ Generally good practices

**Strengths:**
1. Sensitive values in environment variables
2. Clear separation of dev/stage/prod configs
3. Validation function for required config
4. No secrets in source code

**Recommendations:**
1. Use secret management service in production (AWS Secrets Manager, Vault)
2. Implement secret rotation
3. Add .env.example with placeholder values (already done ✅)
4. Document minimum permission requirements

---

## Testing & Quality Assurance

**Current State:** Minimal testing infrastructure

**Findings:**
- Tests directory exists but appears to have minimal coverage
- No security-specific tests found
- No integration tests for authentication flows
- No tests for blockchain interactions

**Recommendations:**
1. Add comprehensive unit tests for security-critical functions
2. Add integration tests for authentication flows
3. Add tests for input validation
4. Add fuzzing tests for API endpoints
5. Add tests for rate limiting (once implemented)
6. Add smart contract tests using Hardhat/Foundry

---

## Deployment Security

### Vercel Deployment

**Configuration:** `vercel.json`

**Current State:** Minimal configuration

**Recommendations:**
1. Configure proper environment variable handling
2. Enable security headers via Vercel dashboard
3. Configure proper logging and monitoring
4. Set up alerts for security events
5. Enable DDoS protection
6. Configure proper CORS policies

---

## Action Items - Priority Order

### 🔴 CRITICAL (Fix Immediately)
1. **C-1:** Replace Math.random() with cryptographically secure random in SIWE nonce and OAuth state generation

### 🟠 HIGH (Fix Within 1 Week)
2. **H-1:** Update js-yaml dependency via npm audit fix
3. **H-2:** Implement rate limiting on API endpoints

### 🟡 MEDIUM (Fix Within 1 Month)
4. **M-1:** Add input validation for blockchain interactions
5. **M-2:** Improve session cookie security configuration
6. **M-3:** Add security headers in Next.js config

### 🔵 LOW (Fix When Possible)
7. **L-1:** Sanitize error messages in production
8. **L-2:** Review private key file loading security

### ℹ️ INFORMATIONAL (Continuous Improvement)
9. **I-1:** Create SECURITY.md
10. **I-2:** Set up automated security scanning
11. **I-3:** Document database security practices

---

## Conclusion

The BountyPay application has a solid foundation with good use of established libraries and frameworks. However, the **CRITICAL** finding regarding weak random number generation must be addressed immediately before any production use.

The smart contract code demonstrates excellent security practices and is well-architected. With professional audit and the fixes outlined above, the application can achieve production-ready security posture.

### Security Score: 6.5/10
- **After Critical Fixes:** 7.5/10
- **After All High Fixes:** 8.5/10
- **After All Fixes:** 9.0/10

---

**Report Generated:** 2025-11-16  
**Next Audit Recommended:** After implementing critical and high severity fixes  
**Contact:** For questions about this audit, please open a GitHub issue.
