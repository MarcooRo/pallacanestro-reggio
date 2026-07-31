import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // CDN immagini LBA (foto giocatori, loghi)
      { protocol: "https", hostname: "lba-media.s3.eu-south-1.amazonaws.com" },
    ],
  },
};

export default nextConfig;
