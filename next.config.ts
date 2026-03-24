import type { NextConfig } from "next";

const apifyModules = [
  './node_modules/proxy-agent/**/*',
  './node_modules/lru-cache/**/*',
  './node_modules/proxy-from-env/**/*',
  './node_modules/agent-base/**/*',
  './node_modules/http-proxy-agent/**/*',
  './node_modules/https-proxy-agent/**/*',
  './node_modules/socks-proxy-agent/**/*',
  './node_modules/socks/**/*',
  './node_modules/pac-proxy-agent/**/*',
  './node_modules/pac-resolver/**/*',
  './node_modules/degenerator/**/*',
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['apify-client', 'proxy-agent'],
  outputFileTracingIncludes: {
    '/api/scrape': apifyModules,
    '/api/scrape-all': apifyModules,
    '/api/cron': apifyModules,
  },
};

export default nextConfig;
