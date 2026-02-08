import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'polymarket.com',
      },
      {
        protocol: 'https',
        hostname: 'gamma-api.polymarket.com',
      },
      {
        protocol: 'https',
        hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com',
      },
       {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Externalize Railgun WASM packages to prevent bundling issues
  // This allows them to use native Node.js fs.readFileSync instead of fetch
  serverExternalPackages: [
    '@railgun-community/poseidon-hash-wasm',
    '@railgun-community/curve25519-scalarmult-wasm',
  ],
  // Add headers for WASM files
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Externalize Railgun WASM packages on server-side to prevent bundling
    // This allows them to use native Node.js fs.readFileSync
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@railgun-community/poseidon-hash-wasm': 'commonjs @railgun-community/poseidon-hash-wasm',
        '@railgun-community/curve25519-scalarmult-wasm': 'commonjs @railgun-community/curve25519-scalarmult-wasm',
      });
    }

    // Polyfills for Node.js modules in browser for Railgun SDK compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
