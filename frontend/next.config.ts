import type { NextConfig } from "next";
import path from "path";

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

  // ✅ FIX: kasih tahu Turbopack root-nya di folder ini (frontend/),
  // bukan di C:\Users\ASUS\ yang ada package-lock.json lain. Tanpa ini,
  // Next.js bakal salah nebak workspace root → cache .next jadi kacau
  // → error "Persisting failed: Unable to commit operations" dan
  // "Cannot find module '../chunks/ssr/[turbopack]_runtime.js'".
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;