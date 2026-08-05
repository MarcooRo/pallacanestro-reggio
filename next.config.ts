import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // CDN immagini LBA (foto giocatori, loghi, news)
      { protocol: "https", hostname: "lba-media.s3.eu-south-1.amazonaws.com" },
      // loghi delle squadre di coppa (BCL)
      { protocol: "https", hostname: "assets.fiba.basketball" },
      // immagini delle news societarie
      { protocol: "https", hostname: "www.pallacanestroreggiana.it" },
      // thumbnail dei video YouTube
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
