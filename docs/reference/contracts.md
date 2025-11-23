# Networks & Contracts

Network support is driven by the registry in `shared/config/chain-registry.js`. Each alias declares RPC, chain metadata, escrow address, and token details; ethers ABIs for escrow/erc20 are defined in the same file.

```mermaid
flowchart TD
  Env["Env vars:\nBLOCKCHAIN_SUPPORTED_*"] --> Builder["buildRegistry()"]
  Builder --> REGISTRY["REGISTRY (alias -> config)"]
  REGISTRY --> API["/api/registry"]
  REGISTRY --> NetworkProvider["NetworkProvider (client)"]
  REGISTRY --> ContractHelpers["contract.js (ethers)"]
```

## Supported aliases
- `BASE_MAINNET` (mainnet) — requires env-provided escrow/token addresses.
- `MEZO_MAINNET` (mainnet) — requires env-provided escrow/token addresses.
- `BASE_SEPOLIA` (testnet) — defaults: escrow `0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7`, token `USDC` at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
- `MEZO_TESTNET` (testnet) — defaults: escrow `0xcBaf5066aDc2299C14112E8A79645900eeb3A76a`, token `MUSD` at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`.

Testnets fall back to the curated defaults above; mainnets must be fully configured through environment variables.

## Configuration
- Choose which aliases are enabled with `BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES` and `BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES` (comma-separated, e.g. `BASE_SEPOLIA,MEZO_TESTNET`).
- Required per-alias env keys when not using defaults: `<ALIAS>_RPC_URL`, `<ALIAS>_ESCROW_ADDRESS`, `<ALIAS>_TOKEN_ADDRESS`, `<ALIAS>_TOKEN_SYMBOL`, `<ALIAS>_TOKEN_DECIMALS`.
- Resolver wallet per alias: `<ALIAS>_OWNER_WALLET` and `<ALIAS>_OWNER_PRIVATE_KEY` (hex, 0x-prefixed). These are used by `resolveBountyOnNetwork`.
- Default alias per group: `BLOCKCHAIN_DEFAULT_TESTNET_ALIAS`, `BLOCKCHAIN_DEFAULT_MAINNET_ALIAS`. The `NetworkProvider` and `/api/network/default` rely on these.

## How the app uses the registry
- `/api/registry` exposes the full map to the client; `NetworkProvider` uses it to populate dropdowns and guard unsupported selections.
- Users store their preferred group (`testnet`/`mainnet`) in the `network_env` cookie via `/api/network/env`. Alias selection falls back to the default for that group.
- Bounty creation stores the alias, chainId, token symbol, and token address alongside the bounty. `/api/contract/bounty/[bountyId]` and payout flows use the saved alias to read/write on-chain.
- `/api/resolver?network=ALIAS` derives the resolver address from configured wallets; `/api/tokens` returns token metadata derived from the registry.

## Escrow ABI surface (summary)
- `createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) returns (bytes32 bountyId)`
- `resolve(bytes32 bountyId, address recipient)`
- `getBounty(bytes32 bountyId)` → tuple (`repoIdHash`, `sponsor`, `resolver`, `amount`, `deadline`, `issueNumber`, `status`)
- `computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber)`

Use `shared/server/blockchain/contract.js` helpers for all contract interactions; they handle non-1559 networks and registry lookups for you.

## Add a new network
1. Add the alias to `CURATED_ALIASES` if it is not already present (or reuse an existing alias).
2. Set `BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES` or `BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES` to include the alias.
3. Provide `<ALIAS>_RPC_URL`, `<ALIAS>_ESCROW_ADDRESS`, `<ALIAS>_TOKEN_ADDRESS`, `<ALIAS>_TOKEN_SYMBOL`, `<ALIAS>_TOKEN_DECIMALS`, and owner wallet env vars.
4. Set `BLOCKCHAIN_DEFAULT_MAINNET_ALIAS`/`BLOCKCHAIN_DEFAULT_TESTNET_ALIAS` so `NetworkProvider` can pick defaults.
