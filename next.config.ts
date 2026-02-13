import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [
      {
        // Allow Firebase Auth popups to communicate back to the opener window.
        // Next.js defaults COOP to 'same-origin' which blocks signInWithPopup.
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
