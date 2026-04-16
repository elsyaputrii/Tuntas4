export default function KaP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      {/* Banner Utama - Ukuran besar sesuai gambar */}
      <div className="max-w-[1200px] mx-auto mb-8">
        <div className="bg-[#4E617A] p-8 shadow-md">
          <h1 className="text-white font-bold text-xl uppercase leading-tight tracking-wide">
            Selamat Datang Di Transformasi Tata Kelola <br />
            Organisasi: Aplikasi Pengelolaan Ketidaksesuaian <br />
            Polibatam
          </h1>
          <p className="text-white text-[10px] mt-2 opacity-80">
            Anda dapat memberi masukan, kritik dan/atau pengaduan terkait polibatam secara online
          </p>
        </div>
      </div>

      {/* Tempat Page.tsx muncul */}
      <div className="max-w-[1200px] mx-auto">
        {children}
      </div>
    </div>
  );
}