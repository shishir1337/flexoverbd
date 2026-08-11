import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/server/services/settings";

/**
 * Minimal web app manifest. With ~98% of traffic on phones, letting people
 * add the store to their home screen is cheap reach — and it makes the
 * Facebook in-app browser hand off to a proper standalone window.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSettings();

  return {
    name: `${site.name} — ${site.shortDescription}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff8e02",
    lang: "en-BD",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icon.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
