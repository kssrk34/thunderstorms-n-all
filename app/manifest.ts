import type { MetadataRoute } from "next";

/** Lets cousins install the site as an app (home screen, full screen, push). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thunderstorms 'n' All",
    short_name: "Thunderstorms",
    description: "Five cousins. Five unique journeys. One shared universe.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070E",
    theme_color: "#05070E",
    categories: ["lifestyle", "productivity", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
