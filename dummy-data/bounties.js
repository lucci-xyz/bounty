// Dummy bounty data for development and testing
export const dummyBounties = [
  {
    id: 1,
    bountyId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    repoFullName: 'facebook/react',
    repoId: 10270250,
    issueNumber: 28145,
    sponsorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    sponsorGithubId: 12345678,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '500000000', // 500 USDC (6 decimals)
    deadline: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
    status: 'open',
    txHash: '0x9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: Date.now() - (2 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 228000,
    issueDescription: 'Improve performance of React Server Components by optimizing the streaming architecture and reducing initial bundle size.',
    language: 'JavaScript',
    labels: ['enhancement', 'performance']
  },
  {
    id: 2,
    bountyId: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234',
    repoFullName: 'vercel/next.js',
    repoId: 70107786,
    issueNumber: 58432,
    sponsorAddress: '0x8B3a9D2F1c6E5d4C3b2A1f0e9D8c7B6a5F4e3D2C',
    sponsorGithubId: 87654321,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '1000000000', // 1000 USDC
    deadline: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), // 14 days from now
    status: 'open',
    txHash: '0x8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a091',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
    updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 125000,
    issueDescription: 'Add support for partial prerendering with dynamic content segments to improve loading performance on edge networks.',
    language: 'TypeScript',
    labels: []
  },
  {
    id: 3,
    bountyId: '0x3c4d5e6f7890abcdef1234567890abcdef123456',
    repoFullName: 'ethereum/go-ethereum',
    repoId: 14877817,
    issueNumber: 29234,
    sponsorAddress: '0x9C4b8D3e2F1a0b9c8D7e6F5a4B3c2D1e0F9a8B7C',
    sponsorGithubId: 23456789,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '2500000000', // 2500 USDC
    deadline: Math.floor(Date.now() / 1000) + (21 * 24 * 60 * 60), // 21 days from now
    status: 'open',
    txHash: '0x7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a09182',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: Date.now() - (1 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 47000,
    issueDescription: 'Optimize state pruning mechanism to reduce disk usage by 40% while maintaining full node sync performance.',
    language: 'Go',
    labels: ['optimization', 'storage']
  },
  {
    id: 4,
    bountyId: '0x4d5e6f7890abcdef1234567890abcdef12345678',
    repoFullName: 'rust-lang/rust',
    repoId: 724712,
    issueNumber: 115678,
    sponsorAddress: '0xaD5e7F6a8B9c0D1e2F3a4B5c6D7e8F9a0B1c2D3e',
    sponsorGithubId: 34567890,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '750000000', // 750 USDC
    deadline: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60), // 3 days from now
    status: 'open',
    txHash: '0x6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
    updatedAt: Date.now() - (10 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 97000,
    issueDescription: 'Implement incremental compilation for async functions to significantly reduce build times in large projects.',
    language: 'Rust',
    labels: ['compiler', 'performance']
  },
  {
    id: 5,
    bountyId: '0x5e6f7890abcdef1234567890abcdef123456789a',
    repoFullName: 'microsoft/vscode',
    repoId: 41881900,
    issueNumber: 198765,
    sponsorAddress: '0xbE6f8A9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F',
    sponsorGithubId: 45678901,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '300000000', // 300 USDC
    deadline: Math.floor(Date.now() / 1000) + (5 * 24 * 60 * 60), // 5 days from now
    status: 'open',
    txHash: '0x5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a091827364',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
    updatedAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 163000,
    issueDescription: 'Add native support for Jupyter notebooks with inline variable inspection and debugging capabilities.',
    language: 'TypeScript',
    labels: ['feature', 'notebooks', 'editor']
  },
  {
    id: 6,
    bountyId: '0x6f7890abcdef1234567890abcdef123456789abc',
    repoFullName: 'tensorflow/tensorflow',
    repoId: 45717250,
    issueNumber: 62134,
    sponsorAddress: '0xcF7a0B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a',
    sponsorGithubId: 56789012,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '1500000000', // 1500 USDC
    deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
    status: 'open',
    txHash: '0x4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
    updatedAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 186000,
    issueDescription: 'Implement distributed training support for transformer models with automatic gradient accumulation and mixed precision.',
    language: 'Python',
    labels: ['enhancement', 'distributed', 'training']
  },
  {
    id: 7,
    bountyId: '0x7890abcdef1234567890abcdef123456789abcde',
    repoFullName: 'nodejs/node',
    repoId: 27193779,
    issueNumber: 50123,
    sponsorAddress: '0xd08B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B',
    sponsorGithubId: 67890123,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '600000000', // 600 USDC
    deadline: Math.floor(Date.now() / 1000) + (10 * 24 * 60 * 60), // 10 days from now
    status: 'open',
    txHash: '0x39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f60',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (4 * 24 * 60 * 60 * 1000), // 4 days ago
    updatedAt: Date.now() - (4 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 107000,
    issueDescription: 'Add experimental WebAssembly support for native modules to improve performance and reduce memory footprint.',
    language: 'JavaScript',
    labels: ['feature', 'wasm', 'performance']
  },
  {
    id: 8,
    bountyId: '0x890abcdef1234567890abcdef123456789abcdef',
    repoFullName: 'vuejs/core',
    repoId: 213708771,
    issueNumber: 9456,
    sponsorAddress: '0xe19C2d3E4f5A6b7C8d9E0f1A2b3C4d5E6f7A8b9C',
    sponsorGithubId: 78901234,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '450000000', // 450 USDC
    deadline: Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60), // 1 day from now
    status: 'open',
    txHash: '0x281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f6071',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (12 * 24 * 60 * 60 * 1000), // 12 days ago
    updatedAt: Date.now() - (12 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 47000,
    issueDescription: 'Optimize reactivity system for large lists by implementing virtual scrolling with automatic batched updates.',
    language: 'TypeScript',
    labels: ['bug', 'performance']
  },
  {
    id: 9,
    bountyId: '0x90abcdef1234567890abcdef123456789abcdef1',
    repoFullName: 'angular/angular',
    repoId: 24195339,
    issueNumber: 52987,
    sponsorAddress: '0xf2aD3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c0D',
    sponsorGithubId: 89012345,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '850000000', // 850 USDC
    deadline: Math.floor(Date.now() / 1000) + (18 * 24 * 60 * 60), // 18 days from now
    status: 'open',
    txHash: '0x1706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f607182',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000), // 6 days ago
    updatedAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 96000,
    issueDescription: 'Implement standalone components migration schematics with automated dependency injection refactoring.',
    language: 'TypeScript',
    labels: []
  },
  {
    id: 10,
    bountyId: '0xabcdef1234567890abcdef1234567890abcdef12',
    repoFullName: 'pytorch/pytorch',
    repoId: 65600975,
    issueNumber: 109876,
    sponsorAddress: '0x03Be4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B9c0D1e',
    sponsorGithubId: 90123456,
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '2000000000', // 2000 USDC
    deadline: Math.floor(Date.now() / 1000) + (25 * 24 * 60 * 60), // 25 days from now
    status: 'open',
    txHash: '0x06f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0918273645f60718293',
    network: 'BASE_SEPOLIA',
    chainId: 84532,
    tokenSymbol: 'USDC',
    environment: 'stage',
    createdAt: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
    updatedAt: Date.now() - (8 * 24 * 60 * 60 * 1000),
    pinnedCommentId: null,
    repoStars: 82000,
    issueDescription: 'Add native Apple Silicon GPU acceleration support with Metal backend for faster training on M1/M2/M3 chips.',
    language: 'Python',
    labels: ['enhancement', 'acceleration', 'apple-silicon']
  }
];

