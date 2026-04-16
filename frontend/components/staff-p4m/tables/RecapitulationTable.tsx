export default function RecapitulationTable() {
  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      {/* Tombol Export di atas tabel sesuai gambar */}
      <div className="flex gap-1 items-center p-2 mb-1 text-[9px]">
        <span>📥 EXPORT : [</span>
        <button className="text-blue-700 hover:underline">PDF</button>
        <span>] [</span>
        <button className="text-blue-700 hover:underline">Excel</button>
        <span>] [</span>
        <button className="text-blue-700 hover:underline">jpg</button>
        <span>]</span>
      </div>

      <div className="flex min-w-[1000px] font-bold uppercase border-t border-black bg-gray-50 text-center">
        <div className="w-12 border-r-2 border-black p-3">NO</div>
        <div className="flex-1 border-r-2 border-black p-3">Uraian Ketidaksesuaian</div>
        <div className="w-48 border-r-2 border-black p-3">Penyebab</div>
        <div className="w-48 border-r-2 border-black p-3">Rencana tindak lanjut</div>
        <div className="w-24 border-r-2 border-black p-3">status</div>
        <div className="flex-1 p-3">Hasil tindak lanjut</div>
      </div>

      <div className="flex min-w-[1000px] border-t-2 border-black text-[11px]">
        {/* No */}
        <div className="w-12 border-r-2 border-black p-3 flex justify-center items-start">
          <span className="font-bold text-base">1</span>
        </div>
        {/* Uraian */}
        <div className="flex-1 border-r-2 border-black p-4 relative">
          <div className="border border-gray-400 p-3 h-24 uppercase font-bold text-[10px]">GU RUSAK</div>
          <button className="absolute bottom-4 left-4 border border-black px-1 flex gap-1 text-[9px] hover:bg-gray-100">
             🖼️ lihat gambar
          </button>
        </div>
        {/* Penyebab */}
        <div className="w-48 border-r-2 border-black p-4 flex items-center justify-center">
          <div className="italic text-gray-500 text-center">di isi kepala unit</div>
        </div>
        {/* Rencana */}
        <div className="w-48 border-r-2 border-black p-4 flex items-center justify-center">
          <div className="italic text-gray-500 text-center">di isi kepala unit</div>
        </div>
        {/* Status */}
        <div className="w-24 border-r-2 border-black p-4 flex items-center justify-center">
          <div className="border border-gray-400 p-1 italic text-center w-full">Di setujui</div>
        </div>
        {/* Hasil */}
        <div className="flex-1 p-4 relative">
          <div className="border border-gray-400 p-3 h-24 italic text-gray-500">
            13/02/2022 <br />
            GU sudah di perbaiki
          </div>
          <button className="absolute bottom-4 left-4 border border-black px-1 flex gap-1 text-[9px] hover:bg-gray-100">
             🖼️ lihat gambar
          </button>
        </div>
      </div>
    </div>
  );
}