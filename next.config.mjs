/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Pages folded into the five main areas. Old links and bookmarks still land somewhere sensible.
    return [
      { source: "/habits", destination: "/quests?tab=habits", permanent: false },
      { source: "/goals", destination: "/quests?tab=goals", permanent: false },
      { source: "/league", destination: "/arena", permanent: false },
      { source: "/bonding", destination: "/arena?tab=together", permanent: false },
      { source: "/settings", destination: "/profile?tab=settings", permanent: false },
      { source: "/health", destination: "/life", permanent: false },
      { source: "/career", destination: "/life", permanent: false },
      { source: "/money", destination: "/life", permanent: false },
      { source: "/reflect", destination: "/life", permanent: false },
    ];
  },
  async headers() {
    return [
      // the service worker must never be cached, or updates would get stuck
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};
export default nextConfig;
