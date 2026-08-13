import type { NextConfig } from "next";

// Ambil hostname backend dari env var (dipakai fetchUserData/foto profil dkk)
// supaya next/image diizinkan me-load gambar dari domain backend produksi,
// bukan cuma localhost pas development.
function getBackendImagePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
  ];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: "/uploads/**",
      });
    } catch {
      // NEXT_PUBLIC_API_URL tidak valid sebagai URL, abaikan saja
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getBackendImagePatterns(),
  },
};

export default nextConfig;