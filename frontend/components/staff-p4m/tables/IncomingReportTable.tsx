"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { stafApi } from "@/lib/api";
import ImageModal from "@/components/ui/ImageModal";
import {
  ChevronDown,
  X,
  Search,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { DAFTAR_UNIT_UMUM } from "@/lib/unitsUmum";
import { PeriodFilterBar, isInPeriodFilter, labelPeriodFilter, type FilterMode } from "@/components/shared/PeriodFilterBar";
import { toLocalDate, fmtTgl } from "@/lib/exportHelpers";
import { createPortal } from "react-dom";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
const DAFTAR_UNIT_DEFAULT = DAFTAR_UNIT_UMUM;

type UnitItem = { grup: string; unit: string };

interface LaporanMasuk {
  id_laporan: number;
  kode_laporan: string;
  jenis_laporan: string;
  deskripsi: string;
  lampiran: string | null;
  status: string;
  tanggal_lapor?: string;
  created_at?: string;
  createdAt?: string;
  tanggal_kejadian?: string;
}

function formatTanggalKejadian(item: LaporanMasuk): string {
  if (!item.tanggal_kejadian) return "Tanggal kejadian tidak diketahui";
  const [y, m, d] = item.tanggal_kejadian.split("-").map(Number);
  if (!y || !m || !d) return "Tanggal kejadian tidak diketahui";
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTanggal(item: LaporanMasuk): Date | null {
  const raw = item.tanggal_lapor || item.created_at || item.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function getTanggalIso(item: LaporanMasuk): string | null {
  const raw = item.tanggal_lapor || item.created_at || item.createdAt;
  return raw ?? null;
}

function formatTanggal(item: LaporanMasuk): string {
  const d = getTanggal(item);
  if (!d) return "Tanggal tidak diketahui";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================
// MULTI SELECT UNIT
// ============================================
function MultiSelectUnit({
  selected,
  onChange,
  daftarUnit,
}: {
  selected: string[];
  onChange: (units: string[]) => void;
  daftarUnit: UnitItem[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = daftarUnit.filter((d) =>
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
    <div className="relative w-full">
      <div
        ref={triggerRef}
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
            <span className="text-gray-400 text-[11px]">pilih unit yang dituju</span>
          )}
        </div>
        <ChevronDown size={13} className={`ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && typeof document !== "undefined" && createPortal(
          <div ref={dropdownRef}
            style={{
              position: "absolute",
              top: `${coords.top + 2}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }} className="z-9999 border border-black bg-white shadow-xl rounded-md overflow-hidden"
          >
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
                  <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                    {grup}
                  </div>
                  {units.map((unit) => (
                    <div
                      key={unit}
                      onClick={() => toggle(unit)}
                      className={`px-3 py-2 text-[11px] flex items-center gap-2 cursor-pointer border-b border-gray-100 last:border-none transition-colors ${
                        selected.includes(unit)
                          ? "bg-blue-50 font-bold text-blue-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(unit)}
                        readOnly
                        className="w-3 h-3 accent-blue-600 pointer-events-none"
                      />
                      {unit}
                    </div>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-3 text-[10px] text-red-400 italic text-center">
                  Unit tidak ditemukan
                </div>
              )}
            </div>

            {selected.length > 0 && (
              <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase">
                  {selected.length} unit terpilih
                </span>
                <button
                  onClick={() => onChange([])}
                  className="text-[9px] text-red-500 font-bold hover:underline"
                >
                  Hapus Semua
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================
// MODAL TAMBAH DATA
// Staf menginput laporan manual + unit tujuan. Setelah disimpan, laporan
// langsung masuk ke "Ketidaksesuaian Masuk" milik unit yang dituju.
// ============================================
function TambahDataModal({
  onClose,
  onSuccess,
  daftarUnit,
}: {
  onClose: () => void;
  onSuccess: (pesan: string) => void;
  daftarUnit: UnitItem[];
}) {
  const hariIni = new Date().toISOString().slice(0, 10);
  const [statusPelapor, setStatusPelapor] = useState("mahasiswa");
  const [jenis, setJenis] = useState("pengaduan");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [units, setUnits] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit() {
    setErr("");
    if (!deskripsi.trim()) return setErr("Deskripsi wajib diisi.");
    if (!tanggal) return setErr("Tanggal kejadian wajib diisi.");
    if (units.length === 0) return setErr("Pilih minimal 1 unit tujuan.");

    const fd = new FormData();
    fd.append("status_pelapor", statusPelapor);
    fd.append("jenis_laporan", jenis);
    fd.append("deskripsi", deskripsi.trim());
    fd.append("tanggal_kejadian", tanggal);
    fd.append("unit_tujuan", JSON.stringify(units));
    if (file) fd.append("lampiran", file);

    try {
      setSaving(true);
      const res = await stafApi.tambahLaporanManual(fd);
      onSuccess(
        `${res?.data?.kode_laporan ?? "Data"} berhasil ditambahkan dan dikirim ke: ${units.join(", ")}`
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menambahkan data.");
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "text-[11px] font-bold uppercase block mb-1";
  const inputCls = "w-full border border-black p-2 text-xs bg-white outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
      <div className="bg-white border-2 border-black w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-black p-3">
          <h3 className="font-bold uppercase text-sm">Tambah Data Laporan</h3>
          <button onClick={onClose} aria-label="Tutup" className="hover:text-red-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {err && (
            <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border border-red-200">{err}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Jenis Laporan</label>
              <select className={inputCls} value={jenis} onChange={(e) => setJenis(e.target.value)}>
                <option value="masukan">Masukan</option>
                <option value="kritik">Kritik</option>
                <option value="pengaduan">Pengaduan</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status Pelapor</label>
              <select
                className={inputCls}
                value={statusPelapor}
                onChange={(e) => setStatusPelapor(e.target.value)}
              >
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
                <option value="tendik">Tendik</option>
                <option value="masyarakat">Masyarakat Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Tanggal Kejadian</label>
            <input
              type="date"
              max={hariIni}
              className={inputCls}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Deskripsi</label>
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              placeholder="Tuliskan isi laporan..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Lampiran (opsional, PDF/PNG/JPG maks 5MB)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
              className="text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className={labelCls}>Unit yang dituju</label>
            <MultiSelectUnit selected={units} onChange={setUnits} daftarUnit={daftarUnit} />
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t-2 border-black p-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="border border-black px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "MENYIMPAN..." : "SIMPAN & KIRIM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function IncomingReportTable() {
  const [laporan, setLaporan] = useState<LaporanMasuk[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingKirim, setLoadingKirim] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("semua");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTambah, setShowTambah] = useState(false);
  const [daftarUnit, setDaftarUnit] = useState<UnitItem[]>(DAFTAR_UNIT_DEFAULT);

  useEffect(() => {
    fetchData();
    fetchDaftarUnit();
  }, []);

  // Ambil daftar unit dari server (bawaan + unit dari akun Kepala Unit).
  // Kalau gagal, tetap pakai daftar bawaan.
  async function fetchDaftarUnit() {
    try {
      const res = await stafApi.getDaftarUnit();
      if (Array.isArray(res?.data) && res.data.length > 0) setDaftarUnit(res.data);
    } catch (err) {
      console.error("Gagal memuat daftar unit:", err);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const res = await stafApi.getLaporanMasuk();

      const dataWithDate: LaporanMasuk[] = res.data.map((item: LaporanMasuk) => ({
        ...item,
        tanggal_lapor: item.tanggal_lapor || item.created_at || item.createdAt || undefined,
      }));

      setLaporan(dataWithDate);

    } catch (err) {
      console.error("❌ Error fetch data:", err);
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
      setSuccessMsg(`${kode} dikirim ke: ${units.join(", ")}`);
      setTimeout(() => setSuccessMsg(""), 5000);

      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mendistribusikan.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoadingKirim(null);
    }
  }

  const laporanTampil = useMemo(() => {
    const filtered = laporan.filter((item) =>
      isInPeriodFilter(filterMode, selectedDate, toLocalDate, getTanggalIso(item))
    );

    return filtered.slice().sort((a, b) => {
      const ta = getTanggal(a)?.getTime() ?? 0;
      const tb = getTanggal(b)?.getTime() ?? 0;
      return tb - ta;
    });
  }, [laporan, filterMode, selectedDate]);

  const highlightedDates = useMemo(() => {
    return new Set(
      laporan
        .map((item) => getTanggal(item))
        .filter((d): d is Date => d !== null)
        .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    );
  }, [laporan]);

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

      {showTambah && (
        <TambahDataModal
          daftarUnit={daftarUnit}
          onClose={() => setShowTambah(false)}
          onSuccess={(pesan) => {
            setShowTambah(false);
            setSuccessMsg(pesan);
            setTimeout(() => setSuccessMsg(""), 5000);
            fetchData();
          }}
        />
      )}

      {/* FILTER PERIODE */}
      <div className="mb-3 px-3">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowTambah(true)}
            className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase inline-flex items-center gap-1.5 hover:bg-blue-700 shadow-md"
          >
            <Plus size={14} /> Tambah Data
          </button>
        </div>
        <PeriodFilterBar
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          highlightedDates={highlightedDates}
          showCalendar={false}
        />
        <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase">
          {laporanTampil.length} laporan · {labelPeriodFilter(filterMode, selectedDate, fmtTgl)}
        </p>
      </div>

      {/* TABLE */}
      <div className="px-3">
        <div className="w-full border-2 border-black bg-white overflow-x-auto">
          {successMsg && (
            <p className="text-green-700 text-xs font-bold p-2 bg-green-50 border-b border-green-200 inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> {successMsg}
            </p>
          )}
          {error && (
            <p className="text-red-500 text-xs font-bold p-2 bg-red-50 border-b border-red-200">
              {error}
            </p>
          )}

          {/* DESKTOP */}
          <div className="hidden md:block min-w-150">
            <div className="flex font-bold uppercase text-xs border-b-2 border-black">
              <div className="flex-1 border-r-2 border-black p-3 text-center">
                Kritik atau Pengaduan Terkait Polibatam
              </div>
              <div className="w-80 p-3 text-center">Unit yang di tuju</div>
            </div>

            {laporanTampil.length === 0 ? (
              <div className="flex min-h-45 items-center justify-center">
                <p className="text-gray-400 italic text-sm">
                  Tidak ada laporan masuk untuk periode ini.
                </p>
              </div>
            ) : (
              laporanTampil.map((item) => (
                <div key={item.id_laporan} className="flex min-h-45 border-t-2 border-black">
                  {/* Kolom deskripsi */}
                  <div className="flex-1 border-r-2 border-black p-5 flex flex-col">
                    <p className="text-[9px] text-gray-400 italic mb-1 font-semibold">
                      {item.kode_laporan} · {item.jenis_laporan}
                    </p>
                    {/* ✅ Teks rata kiri-kanan + jarak antar paragraf */}
                    <div className="border border-gray-400 p-4 text-xs bg-gray-50 overflow-auto flex-1 min-h-35 leading-relaxed text-justify whitespace-pre-wrap wrap-break-words">
                      {item.deskripsi}
                    </div>
                    <p className="mt-3 text-[9px] text-gray-500 font-bold inline-flex items-center gap-1">
                      <Calendar size={10} /> Laporan masuk: {formatTanggal(item)}
                    </p>
                    <p className="mt-1 text-[9px] text-gray-500 font-bold inline-flex items-center gap-1">
                      <Calendar size={10} /> Tanggal kejadian: {formatTanggalKejadian(item)}
                    </p>
                    {item.lampiran && (
                      <button
                        onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran}`)}
                        className="mt-2 border border-black px-2 py-1 inline-flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase w-fit"
                      >
                        <ImageIcon size={12} /> Lihat Gambar
                      </button>
                    )}
                  </div>

                  {/* Kolom Unit — tombol Kirim nempel di bawah dropdown */}
                  <div className="w-80 p-5 flex flex-col gap-3">
                    <label className="text-[11px] font-bold uppercase block text-center">
                      Pilih Unit :
                    </label>
                    <MultiSelectUnit
                      daftarUnit={daftarUnit}
                      selected={selectedUnit[item.id_laporan] || []}
                      onChange={(units) =>
                        setSelectedUnit((prev) => ({
                          ...prev,
                          [item.id_laporan]: units,
                        }))
                      }
                    />
                    {/* ✅ Tombol Kirim tepat di bawah dropdown, tidak ada flex-1 / mt-6 */}
                    <button
                      onClick={() => handleSend(item.id_laporan)}
                      disabled={loadingKirim === item.id_laporan}
                      className="w-full bg-blue-600 text-white py-2 font-bold shadow-md hover:bg-blue-700 transition-all uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingKirim === item.id_laporan ? "MENGIRIM..." : "KIRIM"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* MOBILE */}
          <div className="md:hidden">
            {laporanTampil.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 italic text-sm">
                  Tidak ada laporan masuk untuk periode ini.
                </p>
              </div>
            ) : (
              laporanTampil.map((item) => (
                <div key={item.id_laporan} className="border-t-2 border-black p-4 space-y-3">
                  <p className="text-[10px] text-gray-400 italic">
                    {item.kode_laporan} · {item.jenis_laporan}
                  </p>
                  {/* ✅ Teks rata kiri-kanan + jarak antar paragraf */}
                  <div className="border border-gray-400 p-4 text-xs bg-gray-50 max-h-32 overflow-auto leading-relaxed text-justify whitespace-pre-wrap wrap-break-words">
                    {item.deskripsi}
                  </div>
                  <p className="text-[9px] text-gray-500 font-bold inline-flex items-center gap-1">
                    <Calendar size={10} /> Laporan masuk: {formatTanggal(item)}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold inline-flex items-center gap-1">
                    <Calendar size={10} /> Tanggal kejadian: {formatTanggalKejadian(item)}
                  </p>
                  {item.lampiran && (
                    <button
                      onClick={() => setModalSrc(`${BASE_URL}/uploads/${item.lampiran}`)}
                      className="border border-black px-2 py-1 inline-flex items-center gap-2 text-[10px] hover:bg-gray-100 font-bold uppercase"
                    >
                      <ImageIcon size={12} /> Lihat Gambar
                    </button>
                  )}
                  <div>
                    <label className="text-[11px] font-bold uppercase block mb-1">
                      Pilih Unit :
                    </label>
                    <MultiSelectUnit
                      daftarUnit={daftarUnit}
                      selected={selectedUnit[item.id_laporan] || []}
                      onChange={(units) =>
                        setSelectedUnit((prev) => ({
                          ...prev,
                          [item.id_laporan]: units,
                        }))
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleSend(item.id_laporan)}
                    disabled={loadingKirim === item.id_laporan}
                    className="w-full bg-blue-600 text-white py-2.5 font-bold shadow-md hover:bg-blue-700 transition-all uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingKirim === item.id_laporan ? "MENGIRIM..." : "KIRIM"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}