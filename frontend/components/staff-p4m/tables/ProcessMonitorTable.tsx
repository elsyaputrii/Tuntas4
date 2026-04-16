export default function ProcessMonitorTable() {
  return (
    <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
      <div className="flex min-w-[1200px] font-bold uppercase bg-gray-50 text-center">
        <div className="flex-1 border-r-2 border-black p-3">Kritik atau Pengaduan Terkait Polibatam</div>
        <div className="w-32 border-r-2 border-black p-3">Penyebab</div>
        <div className="w-48 border-r-2 border-black p-3">Rencana Tindak Lanjut</div>
        <div className="w-24 border-r-2 border-black p-3">Status</div>
        <div className="w-64 border-r-2 border-black p-3">Hasil Tindak Lanjut</div>
        <div className="w-36 border-r-2 border-black p-3">Recapt Pencapaian</div>
        <div className="w-40 p-3">EXPORT REPORT</div>
      </div>

      <div className="flex min-w-[1200px] border-t-2 border-black">
        {/* Kolom 1 */}
        <div className="flex-1 border-r-2 border-black p-4">
          <div className="border border-gray-400 p-3 h-28 italic text-gray-500">di isi civitas akademika</div>
        </div>
        {/* Kolom 2 */}
        <div className="w-32 border-r-2 border-black p-4">
          <div className="border border-gray-400 p-2 h-20 italic text-gray-500">di isi ka-p4m</div>
        </div>
        {/* Kolom 3 */}
        <div className="w-48 border-r-2 border-black p-4">
          <div className="border border-gray-400 p-2 h-20 italic text-gray-500">di isi ka-p4m</div>
        </div>
        {/* Kolom 4 (Status) */}
        <div className="w-24 border-r-2 border-black p-4 flex items-start justify-center">
          <div className="font-semibold text-center mt-2">Di setujui</div>
        </div>
        {/* Kolom 5 (Hasil) */}
        <div className="w-64 border-r-2 border-black p-4 relative">
          <div className="border border-gray-400 p-3 h-28 italic text-gray-500 text-[10px]">
            12/12/2006 <br />
            GU sudah di perbaiki
          </div>
          <button className="absolute bottom-4 left-4 border border-black px-1 flex gap-1 text-[9px] hover:bg-gray-100">
             🖼️ lihat gambar
          </button>
        </div>
        {/* Kolom 6 (Recap) */}
        <div className="w-36 border-r-2 border-black p-4 flex flex-col gap-2 justify-center">
          <button className="w-full border border-black py-1 text-[10px] hover:bg-gray-100">CLOSE</button>
          <button className="w-full border border-black py-1 text-[10px] hover:bg-gray-100">OPEN</button>
        </div>
        {/* Kolom 7 (Export) */}
        <div className="w-40 p-4 flex gap-2 justify-center items-center">
          <button className="border border-black px-3 py-1 text-[10px] hover:bg-gray-100">PDF</button>
          <button className="border border-black px-2 py-1 text-[10px] hover:bg-gray-100">EXCEL</button>
        </div>
      </div>
    </div>
  );
}