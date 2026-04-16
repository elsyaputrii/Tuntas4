import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff P4M - TUNTAS Polibatam",
  description: "Halaman kerja khusus Staff P4M untuk pengelolaan ketidaksesuaian",
};

export default function StaffP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-gray-50 flex flex-col">
      {/* Container utama untuk membatasi lebar konten agar tidak terlalu melebar di layar ultra-wide */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden">
        {children}
      </div>
      
      {/* Footer sederhana opsional untuk membedakan area kerja */}
      <footer className="py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-12 text-[10px] text-gray-400 italic">
          &copy; 2026 TUNTAS Polibatam - Sistem Manajemen Mutu
        </div>
      </footer>
    </section>
  );
}