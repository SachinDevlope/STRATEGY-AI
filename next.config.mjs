/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships CJS with Node-only internals; bundling it into the
  // server build breaks its font and stream handling.
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
};

export default nextConfig;
