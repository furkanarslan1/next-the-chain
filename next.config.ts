import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  experimental: {
    agentFeedback: true,
    // Dinamik sayfalar tarayıcıda 60 sn tutulur: sekmeler arası gezinme sunucuya gitmez.
    // Sunucu işlemleri (revalidatePath) bu önbelleği anında temizlediği için veri bayat kalmaz.
    staleTimes: { dynamic: 60 },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
