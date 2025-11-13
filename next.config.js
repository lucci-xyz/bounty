/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Enable ES modules
  experimental: {
    esmExternals: true,
  },

  // Allow public access to environment variables with NEXT_PUBLIC_ prefix
  env: {
    NEXT_PUBLIC_MEZO_RPC_URL: process.env.NEXT_PUBLIC_MEZO_RPC_URL,
  },
};

export default nextConfig;

