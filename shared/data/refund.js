"use client";

// Dummy refund data for local development and design reviews.
export const dummyEligibleRefundBounties = [
  {
    bountyId: '0xdeadbeef00000000000000000000000000000001',
    repoFullName: 'open-ea/ops',
    issueNumber: 128,
    amount: '1000000000',
    tokenSymbol: 'USDC',
    deadline: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
    network: 'BASE_SEPOLIA',
    sponsor: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  },
  {
    bountyId: '0xdeadbeef00000000000000000000000000000002',
    repoFullName: 'fluxlabs/infra',
    issueNumber: 91,
    amount: '2000000000',
    tokenSymbol: 'USDC',
    deadline: Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60,
    network: 'BASE_SEPOLIA',
    sponsor: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  },
  {
    bountyId: '0xdeadbeef00000000000000000000000000000003',
    repoFullName: 'ethereum/go-ethereum',
    issueNumber: 75,
    amount: '500000000',
    tokenSymbol: 'USDC',
    deadline: Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60,
    network: 'BASE_SEPOLIA',
    sponsor: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  }
];

export const dummyFailedPayouts = [
  {
    bountyId: '0xcafebabe00000000000000000000000000000001',
    repoFullName: 'lens-protocol/protocol',
    issueNumber: 32,
    prNumber: 402,
    amount: '650000000',
    tokenSymbol: 'USDC',
    txHash: '0xaaa1230000000000000000000000000000000000000000000000000000000000',
    claimStatus: 'failed'
  },
  {
    bountyId: '0xcafebabe00000000000000000000000000000002',
    repoFullName: 'snapshot-labs/snapshot',
    issueNumber: 17,
    prNumber: 1145,
    amount: '1850000000',
    tokenSymbol: 'USDC',
    txHash: '0xbbb1230000000000000000000000000000000000000000000000000000000000',
    claimStatus: 'failed'
  }
];

