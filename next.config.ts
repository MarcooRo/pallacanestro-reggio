import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // CDN immagini LBA (foto giocatori, loghi, news)
      { protocol: "https", hostname: "lba-media.s3.eu-south-1.amazonaws.com" },
      // immagini delle news societarie
      { protocol: "https", hostname: "www.pallacanestroreggiana.it" },
    ],
  },
};

export default nextConfig;
