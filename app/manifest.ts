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
    // Ana ekran simgesine uzun basınca çıkan kısayollar (Android/Chrome; iOS desteklemez).
    shortcuts: [
      {
        name: "Hızlı tamamla",
        short_name: "Tamamla",
        description: "Bugünün halkalarını tek dokunuşla ekle",
        url: "/quick",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Yeni zincir",
        short_name: "Yeni",
        url: "/chains/new",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Profilim",
        short_name: "Profil",
        url: "/profile",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
