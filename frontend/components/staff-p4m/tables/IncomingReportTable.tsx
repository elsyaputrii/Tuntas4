import UnitSearchSelect from "../UnitSearchSelect";

export default function IncomingReportTable() {
  return (
    <div className="w-full border-2 border-black bg-white overflow-visible">
      {/* Header Tabel */}
      <div className="flex font-bold uppercase text-xs">
        <div className="flex-1 border-r-2 border-black p-3 text-center">Kritik atau Pengaduan Terkait Polibatam</div>
        <div className="w-80 p-3 text-center">Unit yang di tuju</div>
      </div>

      {/* Baris Konten Utama */}
      <div className="flex min-h-[180px] border-t-2 border-black">
        {/* Sisi Kiri: Kritik */}
        <div className="flex-1 border-r-2 border-black p-5 relative">
          <div className="border border-gray-400 p-4 h-28 text-gray-400 italic text-xs bg-gray-50">
            kritik atau pengaduan terkait polibatam
          </div>
          <button className="mt-4 border border-black px-2 py-1 flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase">
             🖼️ Lihat Gambar
          </button>
        </div>

        {/* Sisi Kanan: Pilih Unit & Tombol Send */}
        <div className="w-80 p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase block text-center mb-2">Pilih Unit :</label>
            <UnitSearchSelect />
          </div>

          {/* Tombol Send diletakkan di bawah sesuai Figma */}
          <div className="flex justify-center mt-6">
            <button className="bg-[#5da0dd] text-white px-10 py-2 font-bold shadow-md hover:bg-blue-600 transition-all uppercase text-xs tracking-widest">
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}