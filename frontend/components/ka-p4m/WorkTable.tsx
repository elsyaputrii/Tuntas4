"use client";
import { useState } from "react";

export default function KaP4MTable() {
  // State untuk menampung semua inputan
  const [kritik, setKritik] = useState("");
  const [penyebab, setPenyebab] = useState("");
  const [rencana, setRencana] = useState("");
  const [komentar, setKomentar] = useState("");
  const [tindakan, setTindakan] = useState("");

  return (
    <div className="w-full border-2 border-black bg-white shadow-sm">
      {/* Header Tabel */}
      <div className="flex font-bold text-[10px] uppercase bg-white border-b-2 border-black">
        <div className="w-[25%] p-3 text-center border-r-2 border-black">kritik atau pengaduan terkait polibatam</div>
        <div className="w-[15%] p-3 text-center border-r-2 border-black">Penyebab</div>
        <div className="w-[15%] p-3 text-center border-r-2 border-black">Rencana Tindak Lanjut</div>
        <div className="w-[15%] p-3 text-center border-r-2 border-black">Pilih Tindakan</div>
        <div className="w-[20%] p-3 text-center border-r-2 border-black">Aksi (Komentar)</div>
        <div className="w-[10%] p-3 text-center">Aksi</div>
      </div>

      {/* Baris Input */}
      <div className="flex min-h-[250px]">
        
        {/* 1. Kolom Kritik - SEKARANG BISA DIKETIK */}
        <div className="w-[25%] p-4 border-r-2 border-black">
          <textarea 
            className="w-full h-40 border border-black p-2 text-[11px] outline-none focus:border-blue-500 resize-none italic text-gray-600"
            placeholder="Ketik kritik atau pengaduan dari civitas di sini..."
            value={kritik}
            onChange={(e) => setKritik(e.target.value)}
          />
        </div>

        {/* 2. Kolom Penyebab - BISA DIKETIK */}
        <div className="w-[15%] p-4 border-r-2 border-black">
          <textarea 
            className="w-full h-40 border border-black p-2 text-[11px] outline-none focus:border-blue-500 resize-none"
            placeholder="Ketik penyebab di sini..."
            value={penyebab}
            onChange={(e) => setPenyebab(e.target.value)}
          />
        </div>

        {/* 3. Kolom Rencana - BISA DIKETIK */}
        <div className="w-[15%] p-4 border-r-2 border-black">
          <textarea 
            className="w-full h-40 border border-black p-2 text-[11px] outline-none focus:border-blue-500 resize-none"
            placeholder="Ketik rencana di sini..."
            value={rencana}
            onChange={(e) => setRencana(e.target.value)}
          />
        </div>

        {/* 4. Kolom Pilih Tindakan - DROPDOWN */}
        <div className="w-[15%] p-4 border-r-2 border-black flex items-start">
          <select 
            className="w-full border border-black p-1 text-[10px] font-bold outline-none cursor-pointer bg-white"
            value={tindakan}
            onChange={(e) => setTindakan(e.target.value)}
          >
            <option value="">Pilih Aksi</option>
            <option value="setuju">DISETUJUI</option>
            <option value="tolak">TIDAK DISETUJUI</option>
          </select>
        </div>

        {/* 5. Kolom Komentar - BISA DIKETIK */}
        <div className="w-[20%] p-4 border-r-2 border-black">
          <textarea 
            className="w-full h-40 border border-black p-2 text-[11px] outline-none focus:border-blue-500 resize-none"
            placeholder="di isi ka-p4m..."
            value={komentar}
            onChange={(e) => setKomentar(e.target.value)}
          />
        </div>

        {/* 6. Tombol Send */}
        <div className="w-[10%] flex items-center justify-center p-2">
          <button 
            onClick={() => console.log({ kritik, penyebab, rencana, tindakan, komentar })}
            className="bg-[#3B82F6] text-white font-bold py-2 px-6 rounded text-xs shadow-md active:scale-95 transition-transform"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}