"use client";
import { useState } from 'react';

export default function DiscrepancyTable() {
  // State untuk kolom yang bisa diketik
  const [penyebab, setPenyebab] = useState("");
  const [rencana, setRencana] = useState("");

  return (
    <div className="w-full border-2 border-black bg-white overflow-hidden text-sm">
      <div className="flex font-semibold uppercase bg-gray-50 border-b-2 border-black text-center">
        <div className="w-[40%] border-r-2 border-black p-3 text-[11px]">Kritik atau Pengaduan Terkait Polibatam</div>
        <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Penyebab</div>
        <div className="w-[22%] border-r-2 border-black p-3 text-[11px]">Rencana Tindak Lanjut</div>
        <div className="flex-1 p-3 text-[11px]">Aksi</div>
      </div>

      <div className="flex min-h-[160px]">
        {/* Kolom Kritik (Read Only - Menggunakan div bergaya input) */}
        <div className="w-[40%] border-r-2 border-black p-5">
          <div className="w-full h-32 border border-black p-3 text-xs italic text-gray-400 bg-gray-50">
            Kritik atau pengaduan terkait polibatam (isi dari civitas)
          </div>
        </div>
        
        {/* Kolom Penyebab (Bisa Diketik - Menggunakan Textarea) */}
        <div className="w-[22%] border-r-2 border-black p-5">
          <textarea 
            className="w-full h-32 border border-black p-2 text-xs text-black outline-none focus:border-[#5da0dd] resize-none"
            placeholder="Ketik penyebab di sini..."
            value={penyebab}
            onChange={(e) => setPenyebab(e.target.value)}
          />
        </div>

        {/* Kolom Rencana (Bisa Diketik - Menggunakan Textarea) */}
        <div className="w-[22%] border-r-2 border-black p-5">
          <textarea 
            className="w-full h-32 border border-black p-2 text-xs text-black outline-none focus:border-[#5da0dd] resize-none"
            placeholder="Ketik rencana di sini..."
            value={rencana}
            onChange={(e) => setRencana(e.target.value)}
          />
        </div>

        {/* Tombol Send */}
        <div className="flex-1 p-5 flex items-center justify-center">
          <button className="bg-[#5da0dd] text-white px-8 py-2 rounded font-bold uppercase text-[10px] shadow hover:bg-blue-600 transition-all">
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}