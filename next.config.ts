
import type {NextConfig} from 'next';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development' || process.env.NETLIFY === 'true',
  workboxOptions: {
    disableDevLogs: true,
  },
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    image: '/icons/icon-512x512.png',
  },
  cacheStartUrl: true,
  register: true,
  skipWaiting: true,
  manifest: '/manifest.json',
});


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase']
  }
};

export default withPWA(nextConfig);
