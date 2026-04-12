import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow LAN access during development (e.g. testing on a phone on the same network)
  allowedDevOrigins: ['192.168.0.101'],
};

export default nextConfig;
