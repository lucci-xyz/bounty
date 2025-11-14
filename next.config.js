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

  // Webpack configuration to handle optional dependencies
  webpack: (config, { isServer }) => {
    // Ignore React Native dependencies that aren't needed for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    // Externalize pino-pretty for server-side builds to avoid bundling issues
    if (isServer) {
      config.externals.push('pino-pretty');
    }

    return config;
  },
};

export default nextConfig;

