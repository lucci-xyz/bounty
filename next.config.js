/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Enable ES modules
  experimental: {
    esmExternals: true,
  },

  // Webpack configuration for server-side modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle better-sqlite3 native module
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }
    
    return config;
  },

  // Allow public access to environment variables with NEXT_PUBLIC_ prefix
  env: {
    NEXT_PUBLIC_MEZO_RPC_URL: process.env.NEXT_PUBLIC_MEZO_RPC_URL,
  },
};

export default nextConfig;

