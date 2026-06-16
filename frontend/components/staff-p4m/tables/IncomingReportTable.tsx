"use client";
import { useState, useEffect, useRef } from "react";
import { stafApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import { ChevronDown, X, Search } from "lucide-react";
import { DAFTAR_UNIT_UMUM } from "@/lib/unitsUmum";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

const DAFTAR_UNIT = DAFTAR_UNIT_UMUM;

interface LaporanMasuk {
  id_laporan:    number;
  kode_laporan:  string;
  jenis_laporan: string;
  deskripsi:     string;
  lampiran:      string | null;
  status:        string;
}

function MultiSelectUnit({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (units: string[]) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = DAFTAR_UNIT.filter((d) =>
    d.unit.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, string[]>>((acc, d) => {
    if (!acc[d.grup]) acc[d.grup] = [];
    acc[d.grup].push(d.unit);
    return acc;
  }, {});

  function toggle(unit: string) {
    if (selected.includes(unit)) {
      onChange(selected.filter((s) => s !== unit));
    } else {
      onChange([...selected, unit]);
    }
  }

  function removeOne(unit: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== unit));
  }

  return (
    <div className="relative w-full" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        className="border border-black p-2 flex justify-between items-center cursor-pointer bg-white min-h-8.75"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length > 0 ? (
            selected.map((u) => (
              <span key={u} className="bg-blue-100 text-blue-800 px-2 py-0.5 text-[9px] font-bold flex items-center gap-1">
                {u}
                <X size={9} className="cursor-pointer hover:text-red-500" onClick={(e) => removeOne(u, e)} />
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-[11px]">pilih unit yang di tuju</span>
          )}
        </div>
        <ChevronDown size={13} className={`ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-30 w-full mt-1 border border-black bg-white shadow-xl">
          <div className="p-2 border-b border-gray-200 bg-gray-50 relative">
            <input
              type="text"
              placeholder="Cari unit..."
              className="w-full border border-gray-300 px-2 py-1 text-[11px] outline-none pr-6"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <Search size={11} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {Object.entries(grouped).map(([grup, units]) => (
              <div key={grup}>
                <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase bg-gray-50 border-b border-gray-100">{grup}</div>
                {units.map((unit) => (
                  <div
                    key={unit}
                    onClick={() => toggle(unit)}
                    className={`px-3 py-2 text-[11px] flex items-center gap-2 cursor-pointer border-b border-gray-100 last:border-none transition-colors ${
                      selected.includes(unit) ? "bg-blue-50 font-bold text-blue-700" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <input type="checkbox" checked={selected.includes(unit)} readOnly className="w-3 h-3 accent-blue-polibatam pointer-events-none" />
                    {unit}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-[10px] text-red-400 italic text-center">Unit tidak ditemukan</div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase">{selected.length} unit terpilih</span>
              <button onClick={() => onChange([])} className="text-[9px] text-red-500 font-bold hover:underline">Hapus Semua</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IncomingReportTable() {
  const [laporan,        setLaporan]        = useState<LaporanMasuk[]>([]);
  const [selectedUnit,   setSelectedUnit]   = useState<Record<number, string[]>>({});
  const [loading,        setLoading]        = useState(true);
  const [loadingKirim,   setLoadingKirim]   = useState<number | null>(null);
  const [error,          setError]          = useState("");
  const [successMsg,     setSuccessMsg]     = useState("");
  const [modalSrc,       setModalSrc]       = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await stafApi.getLaporanMasuk();
      setLaporan(res.data);
    } catch {
      setError("Gagal memuat data. Pastikan kamu sudah login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(id_laporan: number) {
    const units = selectedUnit[id_laporan] || [];
    if (units.length === 0) {
      setError("Pilih minimal 1 unit tujuan!");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setError("");
    setSuccessMsg("");
    try {
      setLoadingKirim(id_laporan);
      await stafApi.distribusiLaporan({ id_laporan, unit_tujuan: units });
      const kode = `LAP-${String(id_laporan).padStart(5, "0")}`;
      setSuccessMsg(`✅ ${kode} dikirim ke: ${units.join(", ")}`);
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mendistribusikan.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoadingKirim(null);
    }
  }

  if (loading) {
    return (
      <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
        Memuat laporan masuk...
      </div>
    );
  }

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}

      <div className="w-full border-2 border-black bg-white overflow-x-auto">
        {successMsg && (
          <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200">{successMsg}</p>
        )}
        {error && (
          <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">{error}</p>
        )}

        {/* DESKTOP: tabel asli */}
        <div className="hidden md:block min-w-150">
          <div className="flex font-bold uppercase text-xs border-b-2 border-black">
            <div className="flex-1 border-r-2 border-black p-3 text-center">
              Kritik atau Pengaduan Terkait Polibatam
            </div>
            <div className="w-80 p-3 text-center">Unit yang di tuju</div>
          </div>

          {laporan.length === 0 ? (
            <div className="flex min-h-45 items-center justify-center">
              <p className="text-gray-400 italic text-sm">Tidak ada laporan masuk.</p>
            </div>
          ) : (
            laporan.map((item) => (
              <div key={item.id_laporan} className="flex min-h-45 border-t-2 border-black">
                <div className="flex-1 border-r-2 border-black p-5">
                  <p className="text-[9px] text-gray-400 italic mb-1">{item.kode_laporan} · {item.jenis_laporan}</p>
                  <div className="border border-gray-400 p-4 h-28 text-xs bg-gray-50 overflow-auto">{item.deskripsi}</div>
                  {item.lampiran && (
                    <button
                      onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran}`)}
                      className="mt-4 border border-black px-2 py-1 flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase"
                    >
                      🖼️ Lihat Gambar
                    </button>
                  )}
                </div>
                <div className="w-80 p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase block text-center mb-2">Pilih Unit :</label>
                    <MultiSelectUnit
                      selected={selectedUnit[item.id_laporan] || []}
                      onChange={(units) => setSelectedUnit((prev) => ({ ...prev, [item.id_laporan]: units }))}
                    />
                  </div>
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => handleSend(item.id_laporan)}
                      disabled={loadingKirim === item.id_laporan}
                      className="bg-blue-polibatam text-white px-10 py-2 font-bold shadow-md hover:bg-blue-600 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                    >
                      {loadingKirim === item.id_laporan ? "MENGIRIM..." : "SEND"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MOBILE: card layout */}
        <div className="md:hidden">
          {laporan.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 italic text-sm">Tidak ada laporan masuk.</p>
            </div>
          ) : (
            laporan.map((item) => (
              <div key={item.id_laporan} className="border-t-2 border-black p-4 space-y-3">
                <p className="text-[10px] text-gray-400 italic">{item.kode_laporan} · {item.jenis_laporan}</p>
                <div className="border border-gray-400 p-4 text-xs bg-gray-50 max-h-32 overflow-auto">{item.deskripsi}</div>
                {item.lampiran && (
                  <button
                    onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran}`)}
                    className="border border-black px-2 py-1 flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase"
                  >
                    🖼️ Lihat Gambar
                  </button>
                )}
                <div>
                  <label className="text-[11px] font-bold uppercase block mb-1">Pilih Unit :</label>
                  <MultiSelectUnit
                    selected={selectedUnit[item.id_laporan] || []}
                    onChange={(units) => setSelectedUnit((prev) => ({ ...prev, [item.id_laporan]: units }))}
                  />
                </div>
                <button
                  onClick={() => handleSend(item.id_laporan)}
                  disabled={loadingKirim === item.id_laporan}
                  className="w-full bg-blue-polibatam text-white py-2.5 font-bold shadow-md hover:bg-blue-600 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {loadingKirim === item.id_laporan ? "MENGIRIM..." : "SEND"}
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
}