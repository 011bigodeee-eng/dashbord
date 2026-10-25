import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MD Nation Athlete",
    short_name: "MD Nation",
    description: "Treinos, evolução e acompanhamento com seu personal.",
    start_url: "/athlete",
    scope: "/athlete",
    display: "standalone",
    background_color: "#080a0b",
    theme_color: "#080a0b",
    lang: "pt-BR",
    icons: [
      {
        src: "/athlete/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/athlete/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
