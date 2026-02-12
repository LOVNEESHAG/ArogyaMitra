import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';
const envOrigins = (process.env.DEV_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Build experimental config dynamically to avoid type issues with unpublished experimental fields.
const experimental: Record<string, any> = {};
if (dev && envOrigins.length > 0) {
  experimental.allowedDevOrigins = envOrigins;
}

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: experimental as any,
};

export default nextConfig;
