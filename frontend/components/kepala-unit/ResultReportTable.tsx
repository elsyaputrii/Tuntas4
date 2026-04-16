"use client";
import { useState } from 'react';

export default function ResultReportTable() {
  const [tanggal, setTanggal] = useState("");
  const [uraian, setUraian] = useState("");

  return (
    <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
      <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="w-[25%] border-r-2 border-black p-3 text-[10px]">Kritik atau Pengaduan</div>
        <div className="w-[15%] border-r-2 border-black p-3 text-[10px]">Penyebab</div>
        <div className="w-[15%] border-r-2 border-black p-3 text-[10px]">Rencana</div>
        <div className="w-[10%] border-r-2 border-black p-3 text-[10px]">Status</div>
        <div className="flex-1 p-3 text-[10px]">Laporan Hasil Tindak Lanjut</div>
      </div>

      <div className="flex min-h-[200px]">
        {/* Kolom Info (Read Only) */}
        <div className="w-[25%] border-r-2 border-black p-4 text-gray-400 italic text-[11px] bg-gray-50">isi dari civitas akademik</div>
        <div className="w-[15%] border-r-2 border-black p-4 text-gray-400 italic text-[11px] bg-gray-50">isi penyebab</div>
        <div className="w-[15%] border-r-2 border-black p-4 text-gray-400 italic text-[11px] bg-gray-50">isi rencana</div>
        <div className="w-[10%] border-r-2 border-black p-4 font-bold text-center text-[11px] flex items-center justify-center italic text-blue-600">Di setujui</div>

        {/* Laporan Hasil (Bisa Diketik & Upload) */}
        <div className="flex-1 p-5 space-y-3">
          <input 
            type="date" 
            className="w-full border border-black p-2 text-[11px] outline-none focus:border-[#5da0dd]"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
          <textarea 
            className="w-full h-24 border border-black p-3 text-[11px] text-black outline-none focus:border-[#5da0dd] resize-none"
            placeholder="Tambahkan Uraian Hasil Tindak Lanjut..."
            value={uraian}
            onChange={(e) => setUraian(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              id="upload-gambar"
              className="hidden" 
            />
            <label 
              htmlFor="upload-gambar"
              className="border border-black px-3 py-1 text-[10px] cursor-pointer hover:bg-gray-100 flex items-center gap-2"
            >
              🖼️ tambahkan gambar
            </label>
          </div>
          <div className="flex justify-end">
            <button className="bg-[#5da0dd] text-white px-6 py-1.5 rounded font-bold uppercase text-[10px] hover:bg-blue-600 shadow transition-all">
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}