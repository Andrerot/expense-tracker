import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Spendino",
    short_name: "Spendino",
    description: "Traccia le tue spese quotidiane in modo rapido",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "it-IT",
    categories: ["finance", "productivity"],
    background_color: "#edf6f7",
    theme_color: "#17211d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    prefer_related_applications: false,
  };
}
