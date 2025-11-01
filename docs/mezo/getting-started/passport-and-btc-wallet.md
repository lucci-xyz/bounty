# Mezo Passport & BTC Wallet (Testnet)

This app supports Mezo Testnet wallet connections via Mezo Passport and shows a simple BTC wallet (native token on Mezo Testnet).

## Connect
- Click "Connect via Mezo Passport" (RainbowKit modal)
- Chain: Mezo Testnet (Chain ID 31611)

## Link GitHub to Wallet (SIWE)
- Authenticate with GitHub on `/link-wallet`
- Connect a wallet via Passport
- Click "Link Using Connected Wallet (Passport)"

## BTC Wallet (Testnet)
- Navigate to `/wallet`
- View native balance (BTC)
- Send BTC by entering recipient address and amount (18 decimals)

## RPC
- Default: `https://mezo-testnet.drpc.org`
- Override with `VITE_MEZO_RPC_URL`

Security: Private keys are managed by the user's wallet; the app never stores secrets.

