
"use client";

interface HeroSectionProps {
  onBuatLaporan: () => void;
  onCekStatus: () => void;
}

export default function HeroSection({ onBuatLaporan, onCekStatus }: HeroSectionProps) {
  return (
    <div>
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">
                Sampaikan Laporan<br />
                Ketidaksesuaian dengan Mudah
              </h1>
              <p className="text-blue-100 text-sm md:text-base mb-8">
                Bantu kami meningkatkan kualitas layanan<br className="hidden md:block" />
                di Politeknik Negeri Batam melalui laporan Anda.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <button
                  onClick={onBuatLaporan}
                  className="flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Buat Laporan
                </button>
                <button
                  onClick={onCekStatus}
                  className="flex items-center justify-center gap-2 border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-blue-700 transition-all"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Cek Status Laporan
                </button>
              </div>
            </div>
            {/* Ilustrasi */}
            <div className="flex-shrink-0 hidden md:block">
              <div className="w-52 h-52 bg-blue-500 bg-opacity-40 rounded-3xl flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect x="20" y="15" width="65" height="85" rx="6" fill="white" opacity="0.9"/>
                  <rect x="30" y="30" width="45" height="5" rx="2" fill="#3B82F6"/>
                  <rect x="30" y="42" width="35" height="4" rx="2" fill="#93C5FD"/>
                  <rect x="30" y="52" width="40" height="4" rx="2" fill="#93C5FD"/>
                  <rect x="30" y="62" width="30" height="4" rx="2" fill="#93C5FD"/>
                  <circle cx="88" cy="82" r="18" fill="#10B981"/>
                  <path d="M80 82l5 5 10-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* person */}
                  <circle cx="95" cy="40" r="8" fill="#FDE68A"/>
                  <path d="M82 62c0-7 6-12 13-12s13 5 13 12" fill="#3B82F6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jenis Laporan Cards */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-center text-gray-700 font-semibold text-base mb-6">Jenis Laporan yang Dapat Disampaikan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🎓", title: "Akademik", desc: "KRS, nilai, ujian, wisuda, dll", color: "bg-blue-50 border-blue-200" },
            { icon: "🏫", title: "Fasilitas", desc: "Kelas, lab, perpustakaan, parkir, dll", color: "bg-green-50 border-green-200" },
            { icon: "⚙️", title: "Layanan", desc: "Administrasi, keuangan, kepegawaian, dll", color: "bg-orange-50 border-orange-200" },
            { icon: "💬", title: "Lainnya", desc: "Hal lain yang perlu kami ketahui", color: "bg-purple-50 border-purple-200" },
          ].map((item) => (
            <div key={item.title} className={`border rounded-2xl p-5 text-center cursor-pointer hover:shadow-md transition-all ${item.color}`} onClick={onBuatLaporan}>
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fitur Civitas */}
      <div className="bg-white border-t border-b border-gray-100 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">MENU NAVIGASI (CIVITAS)</p>
              <div className="flex gap-6 mb-6 text-sm font-medium text-gray-600">
                <span className="flex flex-col items-center gap-1">
                  <span className="text-xl">🏠</span> Beranda
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="text-xl">📝</span> Buat Laporan
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="text-xl">🔍</span> Cek Status
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="text-xl">❓</span> FAQ
                </span>
              </div>
              <p className="font-bold text-gray-700 mb-3 text-sm">FITUR UTAMA UNTUK CIVITAS</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {["Tanpa login, mudah digunakan", "Dapatkan nomor tiket unik", "Pantau perkembangan laporan secara real-time", "Notifikasi melalui email (opsional)"].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-500">✅</span>{f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4 max-w-xs">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🔒</div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Data Anda Aman</p>
                <p className="text-xs text-gray-500 mt-1">Laporan bersifat anonim. Kami tidak meminta data pribadi Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}