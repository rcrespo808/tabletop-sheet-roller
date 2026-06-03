import type { NextConfig } from "next";
import { productionSiteOrigin } from "./src/lib/site";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? productionSiteOrigin
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
