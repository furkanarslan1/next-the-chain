import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Chain",
    short_name: "The Chain",
    description: "Zinciri kırma. Her gün bir halka ekle.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14161c",
    theme_color: "#14161c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
