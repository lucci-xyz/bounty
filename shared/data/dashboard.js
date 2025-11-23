// Dummy data for sponsor dashboard in local mode

export const dummyUserBounties = [
  {
    id: 1,
    bountyId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    repoFullName: 'facebook/react',
    repoId: 10270250,
    issueNumber: 28145,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '500000000',
    deadline: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    status: 'open',
    txHash: '0x9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (2 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: false,
    daysRemaining: 7,
    prClaims: []
  },
  {
    id: 2,
    bountyId: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234',
    repoFullName: 'vercel/next.js',
    repoId: 70107786,
    issueNumber: 58432,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '1000000000',
    deadline: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
    status: 'open',
    txHash: '0x8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a091',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: false,
    daysRemaining: 14,
    prClaims: [
      {
        id: 1,
        prNumber: 5891,
        prAuthor: 'johndoe',
        status: 'pending',
        createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000)
      }
    ]
  },
  {
    id: 3,
    bountyId: '0x3c4d5e6f7890abcdef1234567890abcdef123456',
    repoFullName: 'ethereum/go-ethereum',
    repoId: 14877817,
    issueNumber: 29234,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '2500000000',
    deadline: Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60),
    status: 'open',
    txHash: '0x7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a09182',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: true,
    daysRemaining: 0,
    prClaims: []
  },
  {
    id: 4,
    bountyId: '0x4d5e6f7890abcdef1234567890abcdef12345678',
    repoFullName: 'rust-lang/rust',
    repoId: 724712,
    issueNumber: 115678,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '750000000',
    deadline: Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60),
    status: 'resolved',
    txHash: '0x6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (45 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (10 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: true,
    daysRemaining: 0,
    prClaims: [
      {
        id: 2,
        prNumber: 782,
        prAuthor: 'janedoe',
        status: 'paid',
        createdAt: Date.now() - (12 * 24 * 60 * 60 * 1000),
        resolvedAt: Date.now() - (10 * 24 * 60 * 60 * 1000),
        txHash: '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
      }
    ]
  },
  {
    id: 5,
    bountyId: '0x5e6f7890abcdef1234567890abcdef123456789a',
    repoFullName: 'microsoft/vscode',
    repoId: 41881900,
    issueNumber: 198765,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '300000000',
    deadline: Math.floor(Date.now() / 1000) - (20 * 24 * 60 * 60),
    status: 'refunded',
    txHash: '0x5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a091827364',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (60 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (20 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: true,
    daysRemaining: 0,
    prClaims: []
  },
  {
    id: 6,
    bountyId: '0x6f7890abcdef1234567890abcdef123456789abc',
    repoFullName: 'tensorflow/tensorflow',
    repoId: 45717250,
    issueNumber: 62134,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 123456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '1500000000',
    deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    status: 'open',
    txHash: '0x4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    isExpired: false,
    daysRemaining: 30,
    prClaims: [
      {
        id: 3,
        prNumber: 1234,
        prAuthor: 'alicecoder',
        status: 'pending',
        createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        prNumber: 1245,
        prAuthor: 'bobdev',
        status: 'pending',
        createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000)
      }
    ]
  }
];

export const dummyLinkedWallets = [
  {
    id: 1,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    label: 'Primary Wallet',
    linkedAt: Date.now() - (60 * 24 * 60 * 60 * 1000),
    isPrimary: true,
    activeBountiesCount: 4
  },
  {
    id: 2,
    address: '0x8B3a9D2F1c6E5d4C3b2A1f0e9D8c7B6a5F4e3D2C',
    label: 'Secondary Wallet',
    linkedAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
    isPrimary: false,
    activeBountiesCount: 0
  }
];

export const dummyStats = {
  totalBounties: 6,
  openBounties: 3,
  resolvedBounties: 1,
  refundedBounties: 1,
  totalValueLocked: 4300.00,
  totalValuePaid: 750.00
};

export const dummyTopContributors = [
  {
    username: 'johndoe',
    avatarUrl: null,
    totalEarned: 750.00,
    bountiesClaimed: 1,
    successRate: 100
  },
  {
    username: 'janedoe',
    avatarUrl: null,
    totalEarned: 0,
    bountiesClaimed: 1,
    successRate: 0
  },
  {
    username: 'alicecoder',
    avatarUrl: null,
    totalEarned: 0,
    bountiesClaimed: 2,
    successRate: 0
  },
  {
    username: 'bobdev',
    avatarUrl: null,
    totalEarned: 0,
    bountiesClaimed: 1,
    successRate: 0
  }
];

export const dummyWalletBalance = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  balances: [
    { token: 'USDC', amount: 4300.00, usdValue: 4300.00 },
    { token: 'MUSD', amount: 0, usdValue: 0 }
  ],
  totalUsdValue: 4300.00
};

// Contributions data for chart (last 30 days)
export const dummyContributionsData = [
  { date: '1', value: 0 },
  { date: '2', value: 0 },
  { date: '3', value: 500 },
  { date: '4', value: 0 },
  { date: '5', value: 0 },
  { date: '6', value: 0 },
  { date: '7', value: 1000 },
  { date: '8', value: 0 },
  { date: '9', value: 0 },
  { date: '10', value: 0 },
  { date: '11', value: 0 },
  { date: '12', value: 2500 },
  { date: '13', value: 0 },
  { date: '14', value: 750 },
  { date: '15', value: 0 },
  { date: '16', value: 0 },
  { date: '17', value: 0 },
  { date: '18', value: 300 },
  { date: '19', value: 0 },
  { date: '20', value: 0 },
  { date: '21', value: 1500 },
  { date: '22', value: 0 },
  { date: '23', value: 0 },
  { date: '24', value: 0 },
  { date: '25', value: 0 },
  { date: '26', value: 0 },
  { date: '27', value: 0 },
  { date: '28', value: 0 },
  { date: '29', value: 0 },
  { date: '30', value: 0 }
];

export const dummyProfile = {
  user: {
    githubId: 123456789,
    githubUsername: 'local-dev',
    createdAt: Date.now()
  },
  wallet: {
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    verifiedAt: Date.now()
  }
};

export const dummyClaimedBounties = [
  {
    bountyId: '0x123',
    repoFullName: 'test/repo',
    issueNumber: 42,
    amount: '100000000',
    tokenSymbol: 'USDC',
    claimStatus: 'resolved',
    paidAt: Date.now()
  }
];

export const dummyTotalEarned = 100;

