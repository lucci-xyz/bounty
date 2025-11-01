Use this guide to learn how to deploy applications on Mezo. This guide walks you through the steps for deploying an example dApp to Mezo Mainnet. Later, you can use this same process for your own dApp. You will learn how to complete the following tasks:



- Configure a dApp with Passport.

- Deploy the dApp to Mezo Testnet.

- Test the dApp as an end-user.

- Deploy the dApp to product on Mezo Mainnet.




# Before you begin 



- Configure your development environment for Mezo Testnet.

- Install browser wallets for both Ethereum and Bitcoin.

- Get native testnet BTC for development and testing from a BTC faucet

- Get testnet BTC on the Mezo testnet. This BTC is on Mezo testnet and is different from the native BTC in your Bitcoin wallet.




# Step 1: Enabling the dApp with Mezo Passport 




# Install Passport 


Install the Mezo Passport library, RainbowKit, and dependencies:


npm install @mezo-org/passport @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query


# Configure your application 


The configuration process is similar to RainbowKit but uses the getConfig method from passport, which returns a default configuration for Mezo Testnet. Pass getConfig to WagmiProvider.


import { RainbowKitProvider } from "@rainbow-me/rainbowkit";import { QueryClient, QueryClientProvider } from "@tanstack/react-query";import { WagmiProvider } from "wagmi";import { getConfig, matsnetTestnetChain } from "@mezo-org/passport";const queryClient = new QueryClient();ReactDOM.createRoot(document.getElementById("root")!).render(  &lt;React.StrictMode&gt;    &lt;WagmiProvider config={getConfig({ appName: "Your app name" })}&gt;      &lt;QueryClientProvider client={queryClient}&gt;        &lt;RainbowKitProvider initialChain={matsnetTestnetChain}&gt;          {/* Your App component */}        &lt;/RainbowKitProvider&gt;      &lt;/QueryClientProvider&gt;    &lt;/WagmiProvider&gt;  &lt;/React.StrictMode&gt;,);


# Connecting wallets 


To connect to the Mezo Passport wallet, use the standard Wagmi or RainbowKit components.


Wagmi


import { useChainId, useConnect } from "wagmi";export const YourApp = () =&gt; {  const chainId = useChainId();  const { connectors, connect } = useConnect();  return (    &lt;div&gt;      {connectors.map((connector) =&gt; (        &lt;button          type="button"          onClick={() =&gt; {            connect({ connector, chainId });          }}          key={connector.id}        &gt;          {connector.name}        &lt;/button&gt;      ))}    &lt;/div&gt;  );};
RainbowKit


import { ConnectButton } from "@rainbow-me/rainbowkit"export const YourApp = () =&gt; {  return &lt;ConnectButton label="Connect wallet"/&gt;;};


# Step 2: Deploying to Mezo Testnet 




# Step 3: End-to-end testing 




# Step 4: Deploying to Mezo Mainnet 


After you’ve completed development, you can deploy your dApp to Mezo Mainnet as a production application. You will need BTC on Mezo Mainnet to operate the dApp on Mezo Mainnet. Get Mezo Mainnet BTC by bridging assets to Mezo.




# What’s next 


Now that you’ve deployed a testnet dApp