import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow requests from any private LAN IP in dev so phones on the same
  // network can load /_next/* chunks — without this, hydration fails on
  // mobile and the app looks broken (no map, unresponsive buttons).
  // No-op in production. See https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
};

export default nextConfig;
