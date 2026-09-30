import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Camera and microphone are used by the crop doctor and Kisan Mitra on this origin only.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Cloud Run container image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // The Firestore client is loaded only when DATA_BACKEND=firestore; keep it out of bundling.
  serverExternalPackages: ["@google-cloud/firestore"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
