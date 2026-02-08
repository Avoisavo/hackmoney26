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
  // Externalize all RAILGUN/ZK packages to prevent webpack bundling issues.
  // This is CRITICAL: snarkjs/circomlibjs/ffjavascript use WASM internally
  // and break when webpack tries to bundle them. leveldown has native bindings.
  // Matches OrbitUX next.config.mjs for working proof generation.
  serverExternalPackages: [
    '@railgun-community/wallet',
    '@railgun-community/shared-models',
    '@railgun-community/poseidon-hash-wasm',
    '@railgun-community/curve25519-scalarmult-wasm',
    'leveldown',
    'memdown',
    'snarkjs',
    'circomlibjs',
    'ffjavascript',
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
  // Allow long-running API routes for ZK proof generation (matching OrbitUX)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Externalize all RAILGUN/ZK native & WASM packages on server-side.
    // snarkjs WASM hangs at ~95% when bundled by webpack.
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@railgun-community/wallet': 'commonjs @railgun-community/wallet',
        '@railgun-community/shared-models': 'commonjs @railgun-community/shared-models',
        '@railgun-community/poseidon-hash-wasm': 'commonjs @railgun-community/poseidon-hash-wasm',
        '@railgun-community/curve25519-scalarmult-wasm': 'commonjs @railgun-community/curve25519-scalarmult-wasm',
        'snarkjs': 'commonjs snarkjs',
        'circomlibjs': 'commonjs circomlibjs',
        'ffjavascript': 'commonjs ffjavascript',
        'leveldown': 'commonjs leveldown',
        'memdown': 'commonjs memdown',
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
        "@react-native-async-storage/async-storage": false,
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-native-async-storage/async-storage": false,
      };
    }

    // Suppress GraphQL critical dependency warning (the request of a dependency is an expression)
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
