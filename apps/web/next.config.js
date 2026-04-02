/** @type {import('next').NextConfig} */
const nextConfig = {
  // Path aliases are handled via tsconfig.json "paths"
  // Next.js automatically picks them up
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.exercisedb.dev",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
