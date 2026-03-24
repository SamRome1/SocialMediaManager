import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['apify-client', 'proxy-agent'],
  outputFileTracingIncludes: {
    '/api/scrape': ['./node_modules/proxy-agent/**/*'],
    '/api/scrape-all': ['./node_modules/proxy-agent/**/*'],
    '/api/cron': ['./node_modules/proxy-agent/**/*'],
  },
};

export default nextConfig;
