Mezo includes an oracle as part of its validator nodes. Third-party oracles are also available.




# Skip Connect


Mezo uses Skip Connect as its main oracle service. Skip determines the price of an asset pair during block consensus and writes it to the onchain state of the x/oracle Cosmos module. This module is provided by Skip and it is plugged into the Mezo client.


The sidecar runs on the same system as the validator node, so data retrieval and aggregation are completed on the same system and passed to the validator node using gRPC.





For a complete description of how Skip aggregates data, see the Skip Providers documentation.


Skip Connect includes several providers that can be configured in the sidecar. You can find a full list of the available providers in the Skip Connect documentation:



- Skip Providers (API)

- Skip Providers (Websocket)

- Skip Providers and Market Map references:

Providers

- Markets






# Stork


Stork is an oracle protocol that enables ultra low latency connections between data providers and both on and off-chain applications. The most common use-case for Stork is pulling and consuming market data in the form of real time price feeds for DeFi. Stork is available on Mezo Testnet.



- Stork Documentation

- Deployed Contracts on Mezo Testnet




# Supra


Supra is a cross-chain oracle network designed to power dApps across blockchain ecosystems with fast, secure, decentralized, and scalable data solutions. Supra’s Distributed Oracle Agreement (DORA) is available on Mezo Testnet. See the Supra’s Available Networks page to find the correct pull contract and storage contract addresses.



- Supra Documentation
​




# Pyth


The Pyth Network is one of the largest first-party Oracle networks and delivers real-time data across several chains including Mezo. Pyth introduces an innovative low-latency pull oracle design where users can pull price updates onchain when needed. This enables everyone in the onchain environment to access data points efficiently. The Pyth network updates the prices every 400ms to make Pyth one of the fastest onchain oracles.


Pyth’s oracle contracts:



- Mezo Mainnet (proxy): 0x2880aB155794e7179c9eE2e38200202908C17B43

- Mezo Testnet (proxy): 0x2880aB155794e7179c9eE2e38200202908C17B43


See the Pyth Documentation to learn how to use Pyth in your dApp.