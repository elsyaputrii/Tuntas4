export default function SubmissionForm() {
  return (
    <div className="border border-gray-400 p-6 bg-white shadow-sm transition-all animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* Row 1: Status */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="w-40 font-bold text-sm">Input Status :</label>
          <select className="border border-gray-300 p-2 w-full md:w-64 text-gray-500 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">pilih status anda</option>
            <option value="dosen">Dosen</option>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="masyarakat">Masyarakat Umum</option>
          </select>
        </div>

        {/* Row 2: Masukan */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="w-40 font-bold text-sm">Masukan/Saran :</label>
          <textarea 
            placeholder="masukan kritik atau pengaduan terkait polibatam"
            className="border border-gray-300 p-3 flex-1 h-32 text-sm italic outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Row 3: Upload */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="w-40 font-bold text-sm">Tambahkan Gambar :</label>
          <div className="flex-1">
            <label className="flex items-center gap-2 border border-gray-500 px-4 py-2 w-max cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
               <span>🖼️</span> 
               <span className="font-medium text-sm">Tambahkan Dokumen Pendukung</span>
               <input type="file" className="hidden" />
            </label>
            <p className="text-red-600 text-[10px] mt-2 italic font-bold">
              *Gambar Hanya Mendukung : PDF, PNG, JPG
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Kirim */}
      <div className="flex justify-end mt-6">
        <button className="bg-[#5da0dd] text-white px-10 py-2 rounded shadow hover:bg-blue-600 transition-all font-bold tracking-wide">
          Kirim
        </button>
      </div>
    </div>
  );
}