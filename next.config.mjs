/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Habits now live under Quests (daily quests) and Goals has its own page
    return [{ source: "/habits", destination: "/quests", permanent: false }];
  },
};
export default nextConfig;
