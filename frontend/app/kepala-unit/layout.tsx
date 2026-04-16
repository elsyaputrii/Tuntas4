import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kepala Unit - TUNTAS Polibatam",
  description: "Halaman khusus Kepala Unit untuk menindaklanjuti ketidaksesuaian",
};

export default function KepalaUnitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-gray-50 flex flex-col">
      {/* Wrapper utama dengan batas lebar yang nyaman untuk tabel input */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 overflow-x-hidden">
        {children}
      </div>
      
      {/* Footer identitas aplikasi */}
      <footer className="py-6 border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-[10px] text-gray-400 italic">
          &copy; 2026 TUNTAS Polibatam - Sistem Manajemen Mutu (Kepala Unit)
        </div>
      </footer>
    </section>
  );
}