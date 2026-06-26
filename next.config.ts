import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['@react-pdf/renderer'],
  // Visualisatie-engine leest scènefoto's van schijf; op Vercel zit public/
  // niet in de serverless-functie tenzij expliciet meegebundeld
  outputFileTracingIncludes: {
    '/configurator/nieuw': ['./assets/scenes/**/*'],
    '/configuraties': ['./assets/scenes/**/*'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Client router cache: herhaalnavigaties binnen 30s hergebruiken de vorige
    // RSC-payload i.p.v. alles opnieuw te fetchen. React-query houdt de data
    // zelf actueel via gerichte invalidations na mutaties.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'looox.nl' },
    ],
  },
};

export default nextConfig;
