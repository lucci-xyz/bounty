Mezo Passport is a package built on top of RainbowKit and provides additional wallet connection options specifically tailored for Bitcoin wallets and Mezo. With this package, developers can integrate Bitcoin wallet support alongside Ethereum-compatible (EVM) wallets to create a more versatile connection experience for users. Passport integrates with viem and wagmi libraries for streamlined wallet management across Bitcoin and EVM ecosystems.


Get the @mezo-org/passport NPM Package


If you cannot use Mezo Passport for your dApp, the configuration steps in the Configure your Environment guide are sufficient for traditional EVM development.




# Before you begin



- Configure your Environment for development with HardHat or Foundry.

- If you are not familiar with RainbowKit, read the RainbowKit documentation to learn the basics.




# Install


Install the Mezo Passport library, RainbowKit, and dependencies:


npm install @mezo-org/passport @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query


# Configure your application


The configuration process is similar to RainbowKit but uses the getConfig method from passport, which returns a default configuration for Mezo Testnet. Pass getConfig to WagmiProvider.


import { RainbowKitProvider } from "@rainbow-me/rainbowkit";import { QueryClient, QueryClientProvider } from "@tanstack/react-query";import { WagmiProvider } from "wagmi";import { getConfig, mezoTestnet } from "@mezo-org/passport";
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root")!).render(  &lt;React.StrictMode&gt;    &lt;WagmiProvider config={getConfig({ appName: "Your app name" })}&gt;      &lt;QueryClientProvider client={queryClient}&gt;        &lt;RainbowKitProvider initialChain={mezoTestnet}&gt;          {/* Your App component */}        &lt;/RainbowKitProvider&gt;      &lt;/QueryClientProvider&gt;    &lt;/WagmiProvider&gt;  &lt;/React.StrictMode&gt;,);


# Connecting wallets


To connect to the Mezo Passport wallet, use the standard Wagmi or RainbowKit components.




# Wagmi


import { useChainId, useConnect } from "wagmi";
export const YourApp = () =&gt; {  const chainId = useChainId();  const { connectors, connect } = useConnect();
  return (    &lt;div&gt;      {connectors.map((connector) =&gt; (        &lt;button          type="button"          onClick={() =&gt; {            connect({ connector, chainId });          }}          key={connector.id}        &gt;          {connector.name}        &lt;/button&gt;      ))}    &lt;/div&gt;  );};


# RainbowKit


import { ConnectButton } from "@rainbow-me/rainbowkit"
export const YourApp = () =&gt; {  return &lt;ConnectButton label="Connect wallet"/&gt;;};


# Next steps


You can find additional examples in the Mezo Passport Readme. An example dApp is available in the Passport GitHub repository