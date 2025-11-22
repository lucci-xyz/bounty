import path from 'path';

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

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ];
  },

  // Webpack configuration to handle optional dependencies
  webpack: (config, { isServer }) => {
    // Ignore React Native dependencies that aren't needed for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      async_hooks: false,
    };

    // Ensure path aliases are resolved correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd()),
    };

    // Externalize pino-pretty for server-side builds to avoid bundling issues
    if (isServer) {
      config.externals.push('pino-pretty');
    }

    return config;
  },
};

export default nextConfig;

