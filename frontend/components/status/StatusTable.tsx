interface StatusItem {
  id: number;
  message: string;
  status: string;
}

interface StatusTableProps {
  data?: StatusItem[];
}

export default function StatusTable({ data = [] }: StatusTableProps) {
  return (
    <div className="w-full border-2 border-black bg-white transition-all animate-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER: Pakai persentase lebar yang PASTI (75% - 25%) */}
      <div className="flex font-bold text-[11px] uppercase bg-gray-50 border-b-2 border-black">
        <div className="w-[75%] border-r-2 border-black p-3 text-center">
          masukan kritik / saran
        </div>
        <div className="w-[25%] p-3 text-center">
          Status
        </div>
      </div>

      {/* ISI TABEL */}
      {data.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center">
          <p className="text-gray-400 italic text-sm">Belum ada riwayat pengajuan.</p>
        </div>
      ) : (
        data.map((item) => (
          <div key={item.id} className="flex min-h-[180px] border-b-2 last:border-b-0 border-black">
            
            {/* KOLOM KIRI: Lebar WAJIB sama dengan header (75%) */}
            <div className="w-[75%] border-r-2 border-black p-5 relative bg-white">
              {/* Box Putih untuk teks sesuai Figma */}
              <div className="w-full h-36 border border-black p-4 bg-white">
                <p className="font-bold text-sm text-black">{item.message}</p>
                
                {/* Tombol Lihat Gambar */}
                <button className="absolute bottom-10 left-10 border border-black px-2 py-1 flex items-center gap-2 text-[10px] bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span>🖼️</span> Lihat Gambar
                </button>
              </div>
            </div>
            
            {/* KOLOM KANAN: Lebar WAJIB sama dengan header (25%) */}
            <div className="w-[25%] flex items-start justify-center p-5 bg-white">
              <div className="border border-black p-3 text-center text-[10px] leading-tight font-bold uppercase w-full mt-2 shadow-sm">
                {item.status}
              </div>
            </div>

          </div>
        ))
      )}
    </div>
  );
}