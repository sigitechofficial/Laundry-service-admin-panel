const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Improve build performance
  experimental: {
    optimizeCss: true,
  },
  // Enable Turbopack support while maintaining custom webpack config
  turbopack: {},
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Faster refresh in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },

      // ✅ YOUR BACKEND
      { protocol: 'https', hostname: 'prodlaundry.sigisolutions.net' },
    ],
  },
};

module.exports = nextConfig;