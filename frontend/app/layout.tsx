import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Menggunakan font Inter agar tampilan bersih dan modern
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TUNTAS - Pengelolaan Ketidaksesuaian Polibatam",
  description: "Aplikasi Transformasi Tata Kelola Organisasi Politeknik Negeri Batam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        {/* Main container untuk memastikan konten tidak terlalu mepet ke pinggir 
          saat dibuka di layar yang sangat lebar 
        */}
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}