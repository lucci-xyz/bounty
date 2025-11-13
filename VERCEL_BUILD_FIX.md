# Vercel Build Fix

## Issue

Build was failing on Vercel with error:
```
Error: ENOENT: no such file or directory, open './private-key.pem'
```

## Root Cause

The `server/config.js` file was executing file system operations (`readFileSync`) at **module import time** (during the build phase), when environment variables and files don't exist yet in the Vercel build environment.

## Solution

Changed the GitHub private key loading from **eager** to **lazy** evaluation:

### Before (Eager - runs at import time)
```javascript
export const CONFIG = {
  github: {
    privateKey: process.env.GITHUB_PRIVATE_KEY_PATH 
      ? readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8')
      : process.env.GITHUB_PRIVATE_KEY,
  }
}
```

### After (Lazy - runs only when accessed)
```javascript
function getPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY_PATH) {
    try {
      return readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8');
    } catch (error) {
      return process.env.GITHUB_PRIVATE_KEY;
    }
  }
  return process.env.GITHUB_PRIVATE_KEY;
}

export const CONFIG = {
  github: {
    get privateKey() {
      return getPrivateKey();
    }
  }
}
```

## Additional Changes

1. **Conditional .env loading**: Only load `.env` file in development
2. **Lazy validation**: Moved config validation to a `validateConfig()` function
3. **Error handling**: Added try-catch for file reading with fallback

## Benefits

✅ **Build succeeds**: File system operations only run at runtime  
✅ **Flexible**: Supports both file path and direct env var  
✅ **Error resilient**: Falls back gracefully if file doesn't exist  
✅ **Vercel compatible**: Works with serverless environment  

## Testing

```bash
# Local build test
npm run build
# ✓ Compiled successfully

# Vercel deployment
git push origin main
# Build succeeds on Vercel
```

## Key Takeaway

For Vercel/serverless deployments:
- **Never** perform file system operations at module import time
- **Always** use lazy loading (getters, functions) for runtime-only operations
- **Environment variables** are available at runtime, not build time

## Files Modified

- `server/config.js` - Implemented lazy-loading for private key and validation
- `VERCEL_DEPLOYMENT.md` - Added troubleshooting section

---

**Status:** ✅ Fixed - Build now succeeds on Vercel

