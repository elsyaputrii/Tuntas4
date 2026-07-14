"use client";
// FILE: frontend/components/staff-p4m/tables/RecapitulationTable.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { stafApi, userApi } from "@/lib/api";
import { exportExcel } from "@/lib/exportExcel";
import { exportPDFRekap, type PdfKategori } from "@/lib/exportPdf";
import {
  fmtTgl,
  sameDay,
  toLocalDate,
  getMonthWeeks,
  getWeekOfMonth,
  sameWeekOfMonth,
  getReopenAction,
  labelStatusLengkap,
} from "@/lib/exportHelpers";
import type { RekapItem, ProsesItem, ArsipItem } from "@/lib/exportTypes";

const BULAN_PANJANG = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  highlightedDates: Set<string>;
}

/** Kalender kotak-kotak (grid) — dipakai berdampingan dengan dropdown picker.
 *  Tanggal setelah hari ini otomatis abu-abu/tidak bisa diklik. Klik satu
 *  tanggal akan langsung pindah ke mode "Harian" dengan tanggal itu. */
function MiniCalendar({ selectedDate, onSelectDate, highlightedDates }: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const rawFirstDay = new Date(year, month, 1).getDay();
  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const isCurrentViewMonth = year === today.getFullYear() && month === today.getMonth();
  const isFutureViewMonth  = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
      <div className="flex items-center justify-between mb-2">
        <button onClick={()=>setViewDate(new Date(year,month-1,1))}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold">‹</button>
        <span className="text-xs font-semibold text-gray-700">{BULAN_PANJANG[month]} {year}</span>
        <button onClick={()=>setViewDate(new Date(year,month+1,1))}
          disabled={isCurrentViewMonth}
          title={isCurrentViewMonth ? "Tidak bisa melihat bulan setelah hari ini" : undefined}
          className="w-7 h-7 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center text-gray-600 text-sm font-bold">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d=>(
          <div key={d} className="text-center text-[9px] text-gray-400 font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({length:startOffset}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const day=i+1;
          const thisDate=new Date(year,month,day); thisDate.setHours(0,0,0,0);
          const key=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isSelected=sameDay(thisDate,selectedDate);
          const isToday=sameDay(thisDate,today);
          const hasData=highlightedDates.has(key);
          const isFuture=thisDate.getTime()>today.getTime();
          return (
            <button key={day} onClick={()=>{ if(!isFuture) onSelectDate(new Date(year,month,day)); }}
              disabled={isFuture}
              title={isFuture ? "Tidak bisa memilih tanggal setelah hari ini" : undefined}
              className={`w-7 h-7 text-[10px] rounded-full flex items-center justify-center mx-auto relative transition-all
                ${isFuture?"text-gray-300 cursor-not-allowed":isSelected?"bg-dark-header text-white font-bold":isToday?"bg-blue-100 text-blue-700 font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
              {day}
              {hasData&&!isFuture&&<span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected?"bg-white/70":"bg-blue-polibatam"}`}/>}
            </button>
          );
        })}
      </div>
      {isFutureViewMonth && (
        <p className="text-[9px] text-amber-600 text-center mt-1 italic">Menampilkan bulan mendatang — belum ada data</p>
      )}
      <button onClick={()=>{setViewDate(new Date());onSelectDate(new Date());}}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Hari Ini</button>
    </div>
  );
}

interface DailyPickerProps {
  selectedDate: Date;
  onChange: (d: Date) => void;
}

/** Picker Tanggal (harian) — 3 dropdown Tanggal/Bulan/Tahun, tidak bisa melewati hari ini */
function DailyPicker({ selectedDate, onChange }: DailyPickerProps) {
  const today = new Date(); today.setHours(0,0,0,0);
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const selYear  = selectedDate.getFullYear();
  const selMonth = selectedDate.getMonth();
  const selDay   = selectedDate.getDate();

  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const isCurrentMonth = selYear === today.getFullYear() && selMonth === today.getMonth();
  const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const maxMonth = selYear === currentYear ? today.getMonth() : 11;

  function set(day: number, month: number, year: number) {
    // clamp supaya gak pernah lewat hari ini
    let d = new Date(year, month, day);
    if (d.getTime() > today.getTime()) d = new Date(today);
    onChange(d);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">📅 Pilih Tanggal</p>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={selDay}
          onChange={(e)=>set(Number(e.target.value), selMonth, selYear)}
          className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d} disabled={d > maxDay}>{d}</option>
          ))}
        </select>
        <select
          value={selMonth}
          onChange={(e)=>set(Math.min(selDay, new Date(selYear, Number(e.target.value)+1, 0).getDate()), Number(e.target.value), selYear)}
          className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {BULAN_PANJANG.map((b, i) => (
            <option key={b} value={i} disabled={selYear === currentYear && i > maxMonth}>{b}</option>
          ))}
        </select>
        <select
          value={selYear}
          onChange={(e)=>{
            const y = Number(e.target.value);
            const m = y === currentYear ? Math.min(selMonth, today.getMonth()) : selMonth;
            const dim = new Date(y, m + 1, 0).getDate();
            const d = y === currentYear && m === today.getMonth() ? Math.min(selDay, today.getDate()) : Math.min(selDay, dim);
            set(d, m, y);
          }}
          className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button onClick={()=>onChange(new Date())}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Hari Ini</button>
    </div>
  );
}

interface WeeklyPickerProps {
  selectedDate: Date;
  onChange: (d: Date) => void;
}

function fmtRange(d: Date) {
  return `${d.getDate()} ${BULAN_PANJANG[d.getMonth()].slice(0,3)}`;
}

/** Picker Minggu (mingguan) — pilih Bulan+Tahun dulu, lalu pilih Minggu KE BERAPA
 *  di dalam bulan itu (Minggu 1, Minggu 2, dst — reset tiap bulan, bukan minggu
 *  ke-sekian dalam setahun). Tidak bisa melewati bulan/minggu yang belum sampai. */
function WeeklyPicker({ selectedDate, onChange }: WeeklyPickerProps) {
  const today = new Date(); today.setHours(0,0,0,0);
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const selYear  = selectedDate.getFullYear();
  const selMonth = selectedDate.getMonth();
  const maxMonth = selYear === currentYear ? today.getMonth() : 11;

  const allWeeks = getMonthWeeks(selYear, selMonth);
  const isCurrentMonth = selYear === today.getFullYear() && selMonth === today.getMonth();
  const weeks = isCurrentMonth
    ? allWeeks.filter((w) => w.start.getTime() <= today.getTime())
    : allWeeks;
  const activeWeekNum = getWeekOfMonth(selectedDate).weekNum;
  const activeWeek = weeks.find((w) => w.weekNum === activeWeekNum) ?? weeks[weeks.length - 1];

  function goToMonth(year: number, month: number) {
    const ws = getMonthWeeks(year, month).filter(
      (w) => !(year === today.getFullYear() && month === today.getMonth()) || w.start.getTime() <= today.getTime()
    );
    const last = ws[ws.length - 1];
    if (last) onChange(new Date(last.start));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">🗓️ Pilih Minggu</p>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={selMonth}
            onChange={(e)=>goToMonth(selYear, Number(e.target.value))}
            className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
          >
            {BULAN_PANJANG.map((b, i) => (
              <option key={b} value={i} disabled={selYear === currentYear && i > maxMonth}>{b}</option>
            ))}
          </select>
          <select
            value={selYear}
            onChange={(e)=>{
              const y = Number(e.target.value);
              const m = y === currentYear ? Math.min(selMonth, today.getMonth()) : selMonth;
              goToMonth(y, m);
            }}
            className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <select
          value={activeWeek?.weekNum ?? 1}
          onChange={(e)=>{
            const w = weeks.find((w)=>w.weekNum === Number(e.target.value));
            if (w) onChange(new Date(w.start));
          }}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {weeks.map((w) => (
            <option key={w.weekNum} value={w.weekNum}>
              Minggu {w.weekNum} · {fmtRange(w.start)} – {fmtRange(w.end)}
            </option>
          ))}
        </select>
      </div>
      <button onClick={()=>onChange(new Date())}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Minggu Ini</button>
    </div>
  );
}

type FilterMode = "semua"|"harian"|"mingguan"|"bulanan"|"tahunan";

interface MonthYearPickerProps {
  selectedDate: Date;
  onChange: (d: Date) => void;
}

/** Picker Bulan + Tahun untuk mode "bulanan" — tidak bisa melewati bulan berjalan */
function MonthYearPicker({ selectedDate, onChange }: MonthYearPickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i); // 5 tahun terakhir + tahun ini
  const selYear  = selectedDate.getFullYear();
  const selMonth = selectedDate.getMonth();
  const maxMonth = selYear === currentYear ? today.getMonth() : 11;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">📆 Pilih Bulan</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selMonth}
          onChange={(e)=>{
            const m = Number(e.target.value);
            onChange(new Date(selYear, m, 1));
          }}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {BULAN_PANJANG.map((b, i) => (
            <option key={b} value={i} disabled={selYear === currentYear && i > maxMonth}>{b}</option>
          ))}
        </select>
        <select
          value={selYear}
          onChange={(e)=>{
            const y = Number(e.target.value);
            const m = y === currentYear ? Math.min(selMonth, today.getMonth()) : selMonth;
            onChange(new Date(y, m, 1));
          }}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button onClick={()=>onChange(new Date(currentYear, today.getMonth(), 1))}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Bulan Ini</button>
    </div>
  );
}

interface YearPickerProps {
  selectedDate: Date;
  onChange: (d: Date) => void;
}

/** Picker Tahun untuk mode "tahunan" — tidak bisa melewati tahun berjalan */
function YearPicker({ selectedDate, onChange }: YearPickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i); // 7 tahun terakhir + tahun ini
  const selYear = selectedDate.getFullYear();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm w-full">
      <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">🗃️ Pilih Tahun</p>
      <select
        value={selYear}
        onChange={(e)=>onChange(new Date(Number(e.target.value), selectedDate.getMonth(), selectedDate.getDate()))}
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-dark-header/30"
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={()=>onChange(new Date())}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Tahun Ini</button>
    </div>
  );
}

export default function RecapitulationTable() {
  const [rekapData,  setRekapData]  = useState<RekapItem[]>([]);
  const [prosesData, setProsesData] = useState<ProsesItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [msg,        setMsg]        = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarResetKey, setCalendarResetKey] = useState(0);
  const [filterMode,   setFilterMode]   = useState<FilterMode>("semua");
  const [exportingExcelLoading, setExportingExcelLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState<PdfKategori|null>(null);
  const [pendingReopen, setPendingReopen] = useState<Set<number>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [kaP4M, setKaP4M] = useState<{ nama: string | null; tandaTangan: string | null } | null>(null);

  // ✅ state utk fitur "Upload Data Lama" (arsip Excel s/d 10 tahun
  // ke belakang) yang tampil di sebelah tombol Excel pada bar Export.
  const tahunSekarang = new Date().getFullYear();
  const [showUploadArsip, setShowUploadArsip] = useState(false);
  const [uploadTahun, setUploadTahun] = useState<number>(tahunSekarang - 1);
  const [uploadingArsip, setUploadingArsip] = useState(false);
  const [fileArsipTerpilih, setFileArsipTerpilih] = useState<File | null>(null);
  const fileArsipRef = useRef<HTMLInputElement>(null);
  const tahunPilihanArsip = Array.from({ length: 11 }, (_, i) => tahunSekarang - i); // tahun ini + 10 tahun lalu

  async function handlePilihFileArsip(file: File) {
    setUploadingArsip(true); setError(""); setMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tahun", String(uploadTahun));
      const res = await stafApi.uploadArsipRekap(formData);
      setMsg(res.message ?? `Berhasil mengimpor data arsip tahun ${uploadTahun}.`);
      setShowUploadArsip(false);
      setTimeout(()=>setMsg(""),6000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file arsip.");
      setTimeout(()=>setError(""),5000);
    } finally {
      setUploadingArsip(false);
      setFileArsipTerpilih(null);
      if (fileArsipRef.current) fileArsipRef.current.value = "";
    }
  }

  useEffect(() => {
    // Ambil data penandatangan (Kepala P4M) untuk ditempel di PDF Rekapitulasi
    userApi.getUsers()
      .then((list: Array<{ role: string; name: string; tandaTangan?: string | null }>) => {
        const kepalaP4M = list.find((u) => u.role === "ka_p4m");
        if (kepalaP4M) {
          setKaP4M({ nama: kepalaP4M.name, tandaTangan: kepalaP4M.tandaTangan ?? null });
        }
      })
      .catch(() => { /* nonfatal — PDF tetap bisa dicetak tanpa TTD */ });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [rekapRes, prosesRes] = await Promise.all([
        stafApi.getRekapitulasi(),
        stafApi.getProsesMonitor(),
      ]);
      setRekapData(rekapRes.data ?? []);
      setProsesData(prosesRes.data ?? []);
      setPendingReopen(new Set());
    } catch { setError("Gagal memuat data rekapitulasi."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const selesaiBoxingIds = new Set(rekapData.map(d=>d.id_boxing));
  const dipantauData     = prosesData.filter(p=>!selesaiBoxingIds.has(p.id_boxing));

  const allItems = [
    ...rekapData.map(d=>({
      id_boxing:d.id_boxing, kode:d.kode_laporan, jenis:d.jenis_laporan??"—",
      uraian:d.uraian_ketidaksesuaian??"—", unit:d.nama_unit??"—",
      penyebab:d.penyebab??"—", rencana:d.rencana_tindakan??"—",
      hasil:d.hasil_tindakan??"—", tglPelaksanaan:fmtTgl(d.tanggal_pelaksanaan),
      statusReview:d.status_review??"", statusBoxing:d.status_boxing??"selesai",
      approvalStaf: null as string | null,
      tglMasuk:d.created_at??null, isSelesai:d.status_boxing==="selesai",
    })),
    ...dipantauData.map(p=>({
      id_boxing:p.id_boxing, kode:p.kode_laporan, jenis:p.jenis_laporan??"—",
      uraian:p.isi_laporan??"—", unit:p.nama_unit??"—",
      penyebab:p.penyebab??"—", rencana:p.rencana_tindakan??"—",
      hasil:p.hasil_tindakan??"—", tglPelaksanaan:fmtTgl(p.tanggal_pelaksanaan),
      statusReview:p.status_review??"", statusBoxing:p.status_boxing??"",
      approvalStaf: p.approval_staf ?? null,
      tglMasuk:p.created_at??null, isSelesai:false,
    })),
  ];

  const highlightedDates = new Set<string>(
    allItems.filter(d=>d.tglMasuk).map(d=>{
      const dt = toLocalDate(d.tglMasuk!);
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    })
  );

  function isInFilter(tglMasuk:string|null):boolean{
    if(filterMode==="semua") return true;
    if(!tglMasuk) return false;
    const d = toLocalDate(tglMasuk);
    if(filterMode==="harian")   return sameDay(d,selectedDate);
    if(filterMode==="mingguan") return sameWeekOfMonth(d,selectedDate);
    if(filterMode==="bulanan")  return d.getFullYear()===selectedDate.getFullYear()&&d.getMonth()===selectedDate.getMonth();
    return d.getFullYear()===selectedDate.getFullYear();
  }

  const filteredItems   = allItems.filter(d=>isInFilter(d.tglMasuk));
  const totalAll        = filteredItems.length;
  const selesaiCount    = filteredItems.filter(d=>d.isSelesai).length;
  const ditindakCount   = filteredItems.filter(d=>d.statusReview==="ditindaklanjuti").length;
  const tidakDitindak   = filteredItems.filter(d=>d.statusReview==="tidak_ditindaklanjuti").length;
  const menungguCount   = filteredItems.filter(d=>!["ditindaklanjuti","tidak_ditindaklanjuti"].includes(d.statusReview)).length;

  const mingguSelected = getWeekOfMonth(selectedDate);
  const labelFilter:Record<FilterMode,string>={
    semua:"Semua Waktu", harian:fmtTgl(selectedDate.toISOString()),
    mingguan:`Minggu ${mingguSelected.weekNum} · ${mingguSelected.start.getDate()}–${mingguSelected.end.getDate()} ${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    bulanan:`${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    tahunan:`Tahun ${selectedDate.getFullYear()}`,
  };

  async function bukaLagi(id_boxing:number, aksi: "ditindak_lanjut" | "lanjut"){
    const ok=confirm("Laporan akan dibuka kembali dari awal ke Kepala Unit. Lanjutkan?");
    if(!ok) return;
    setPendingReopen(prev => new Set(prev).add(id_boxing));
    try{
      const res=await stafApi.setKeputusanBoxing(id_boxing, aksi);
      setMsg(res.message); setTimeout(()=>setMsg(""),5000);
      fetchData();
    }catch(err:unknown){
      setPendingReopen(prev => { const n = new Set(prev); n.delete(id_boxing); return n; });
      setError(err instanceof Error?err.message:"Gagal."); setTimeout(()=>setError(""),4000);
    }
  }

  if(loading) return(
    <div className="w-full border-2 border-black bg-white p-10 text-center text-sm text-gray-400 italic">
      Memuat data rekapitulasi…
    </div>
  );

  return(
    <div className="w-full space-y-4">
      {msg   &&<p className="text-green-700 text-xs font-bold px-3 py-2 bg-green-50 border border-green-200 rounded">{msg}</p>}
      {error &&<p className="text-red-500 text-xs font-bold px-3 py-2 bg-red-50 border border-red-200 rounded">❌ {error}</p>}

      {/* Filter pill — scroll horizontal di HP */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["harian","mingguan","bulanan","tahunan","semua"] as FilterMode[]).map(mode=>(
          <button key={mode} onClick={()=>{ setFilterMode(mode); setCalendarResetKey(k=>k+1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all
              ${filterMode===mode?"bg-dark-header text-white border-dark-header shadow":"bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            {mode==="semua"?"📋 Semua":mode==="harian"?"📅 Harian":mode==="mingguan"?"🗓️ Mingguan":mode==="bulanan"?"📆 Bulanan":"🗃️ Tahunan"}
          </button>
        ))}
      </div>

      {/* Toggle picker periode — mobile only */}
      <button
        onClick={()=>setShowPicker(v=>!v)}
        className="sm:hidden w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 shadow-sm"
      >
        <span>📅 {showPicker ? "Sembunyikan Kalender & Filter" : "Kalender & Filter Periode"}</span>
        <span>{showPicker ? "▲" : "▼"}</span>
      </button>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar: kalender kotak-kotak SELALU tampil, ditambah dropdown
            picker sesuai mode filter yang aktif di bawahnya. Semua opsi
            dibatasi supaya gak bisa pilih hari/minggu/bulan/tahun yang
            belum sampai (masih di masa depan). */}
        <div className={`${showPicker ? "block" : "hidden"} sm:block sm:w-56 md:w-60 shrink-0 space-y-3`}>
          {filterMode === "harian" && (
            <DailyPicker selectedDate={selectedDate} onChange={(d)=>setSelectedDate(d)} />
          )}
          {filterMode === "mingguan" && (
            <WeeklyPicker selectedDate={selectedDate} onChange={(d)=>setSelectedDate(d)} />
          )}
          {filterMode === "bulanan" && (
            <MonthYearPicker selectedDate={selectedDate} onChange={(d)=>setSelectedDate(d)} />
          )}
          {filterMode === "tahunan" && (
            <YearPicker selectedDate={selectedDate} onChange={(d)=>setSelectedDate(d)} />
          )}
          <MiniCalendar
            key={calendarResetKey}
            selectedDate={selectedDate}
            onSelectDate={(d)=>{setSelectedDate(d);setFilterMode("harian");}}
            highlightedDates={highlightedDates}
          />
        </div>

        {/* Statistik */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase mb-3">📋 Rekap Status Tindak Lanjut</p>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-dark-header text-white">
                  <th className="p-2 text-left border border-[#3a4d5e]">Status</th>
                  <th className="p-2 text-center border border-[#3a4d5e]">Jumlah</th>
                  <th className="p-2 text-center border border-[#3a4d5e]">Persentase</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {label:"✅ Ditindaklanjuti",count:ditindakCount,cls:"bg-green-50 text-green-800"},
                  {label:"❌ Tidak Ditindaklanjuti",count:tidakDitindak,cls:"bg-red-50 text-red-800"},
                  {label:"⏳ Menunggu / Proses",count:menungguCount,cls:"bg-yellow-50 text-yellow-800"},
                  {label:"📂 Total",count:totalAll,cls:"bg-gray-50 text-gray-800 font-bold"},
                ].map(r=>(
                  <tr key={r.label} className={r.cls}>
                    <td className="p-2 border border-gray-200">{r.label}</td>
                    <td className="p-2 border border-gray-200 text-center font-bold text-sm">{r.count}</td>
                    <td className="p-2 border border-gray-200 text-center">
                      {totalAll>0?`${((r.count/totalAll)*100).toFixed(1)}%`:"—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold w-full sm:w-auto">📥 Export:</span>
        <button
          onClick={async ()=>{
            setExportingExcelLoading(true);
            try{
              const filteredRekap = rekapData.filter(d=>isInFilter(d.created_at??null));
              const filteredDipantau = prosesData.filter(p=>{
                const ids=new Set(rekapData.map(d=>d.id_boxing));
                return !ids.has(p.id_boxing)&&isInFilter(p.created_at??null);
              });
              // ✅ FIX: Data arsip sekarang ikut mengikuti filter di layar —
              // kalau lagi mode "Tahunan" dan pilih tahun tertentu, cuma
              // arsip tahun itu yang disertakan (bukan semua tahun) supaya
              // export Excel sesuai dengan tahun yang lagi dipilih di layar.
              // Untuk mode lain (Semua/Harian/Mingguan/Bulanan), semua
              // tahun arsip yang pernah diupload tetap disertakan.
              let arsipData: ArsipItem[] = [];
              try{
                const tahunFilter = filterMode === "tahunan" ? selectedDate.getFullYear() : undefined;
                const arsipRes = await stafApi.getArsipRekap(tahunFilter);
                arsipData = arsipRes.data ?? [];
              }catch{ /* nonfatal — export tetap jalan tanpa data arsip */ }
              await exportExcel(filteredRekap, filteredDipantau, arsipData);
            } finally {
              setTimeout(()=>setExportingExcelLoading(false),1200);
            }
          }}
          disabled={exportingExcelLoading||filteredItems.length===0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white text-[10px] font-bold rounded transition-all">
          {exportingExcelLoading?<span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:"📊"} Excel
        </button>

        {/* Upload Data Lama — di samping tombol Excel. Staf pilih
            tahun (s/d 10 tahun ke belakang) lalu unggah file Excel data
            tahun tsb; datanya akan ikut muncul rapi per tahun saat Excel
            di-export lagi lewat tombol di atas. */}
        <div className="relative">
          <button
            onClick={()=>setShowUploadArsip(v=>!v)}
            disabled={uploadingArsip}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white text-[10px] font-bold rounded transition-all">
            {uploadingArsip?<span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:"📁"} Upload Data Lama
          </button>

          {showUploadArsip && (
            <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-black uppercase">🗃️ Upload Data Excel Tahun Lalu</p>
              <p className="text-[9px] text-black leading-snug">
                Pilih tahun datanya, lalu pilih file Excel (.xlsx/.xls) yang kolomnya
                seperti hasil export ini (Kode Laporan, Uraian, Penyebab, dst).
                Bisa untuk 1 sampai 10 tahun ke belakang. Selain file Excel tidak
                akan bisa dipilih.
              </p>
              <select
                value={uploadTahun}
                onChange={(e)=>setUploadTahun(Number(e.target.value))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black focus:outline-none focus:ring-2 focus:ring-dark-header/30"
              >
                {tahunPilihanArsip.map((y)=> <option key={y} value={y}>{y}</option>)}
              </select>

              {/* Input file asli disembunyikan; label di bawah ini yang jadi
                  tombol pemicunya supaya teks bawaan browser "No file chosen"
                  tidak ikut tampil. accept diperluas dengan MIME type resmi
                  supaya dialog "buka file" lebih ketat menyaring file Excel. */}
              <input
                ref={fileArsipRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e)=>{
                  const file = e.target.files?.[0];
                  if(!file){ setFileArsipTerpilih(null); return; }
                  // Jaga-jaga: validasi ekstensi lagi di sisi klien, kalau2
                  // dialog OS/browser tertentu tetap mengizinkan pilih file lain.
                  if(!/\.(xlsx|xls)$/i.test(file.name)){
                    setError("Hanya file Excel (.xlsx / .xls) yang diperbolehkan.");
                    setTimeout(()=>setError(""),5000);
                    setFileArsipTerpilih(null);
                    if (fileArsipRef.current) fileArsipRef.current.value = "";
                    return;
                  }
                  setFileArsipTerpilih(file);
                }}
                className="hidden"
              />
              <label
                onClick={()=>fileArsipRef.current?.click()}
                className="w-full block cursor-pointer text-center text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded py-1.5 px-2"
              >
                📁 {fileArsipTerpilih ? fileArsipTerpilih.name : "Pilih File Excel"}
              </label>

              <button
                onClick={()=>{ if(fileArsipTerpilih) handlePilihFileArsip(fileArsipTerpilih); }}
                disabled={!fileArsipTerpilih || uploadingArsip}
                className="w-full text-[10px] font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 rounded py-1.5 text-center transition-all">
                {uploadingArsip?<span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:"⬆️ Upload"}
              </button>

              <button onClick={()=>{setShowUploadArsip(false); setFileArsipTerpilih(null);}}
                className="w-full text-[10px] text-black hover:text-gray-600 text-center">Tutup</button>
            </div>
          )}
        </div>

        <span className="text-[9px] text-gray-400">PDF:</span>
        {(["harian","mingguan","bulanan","tahunan"] as PdfKategori[]).map(kat=>(
          <button key={kat}
            onClick={async ()=>{ setExportingPDF(kat); await exportPDFRekap(rekapData,prosesData,kat,selectedDate,kaP4M); setExportingPDF(null); }}
            disabled={exportingPDF===kat}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[10px] font-bold rounded transition-all">
            📄 {kat.charAt(0).toUpperCase()+kat.slice(1)}
          </button>
        ))}
        <span className="text-[9px] text-gray-400 ml-auto italic hidden sm:block">
          {filteredItems.length} laporan · {labelFilter[filterMode]}
        </span>
      </div>

      {/* Tabel — DESKTOP */}
      <div className="hidden md:block w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <div className="flex min-w-175 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="w-10 border-r-2 border-black p-2">No</div>
          <div className="flex-1 border-r-2 border-black p-2">Uraian Ketidaksesuaian</div>
          <div className="w-36 border-r-2 border-black p-2">Penyebab</div>
          <div className="w-36 border-r-2 border-black p-2">Rencana</div>
          <div className="w-28 border-r-2 border-black p-2">Status</div>
          <div className="flex-1 border-r-2 border-black p-2">Hasil Tindak Lanjut</div>
          <div className="w-32 p-2">Tindakan</div>
        </div>
        {filteredItems.length===0?(
          <div className="flex p-8 justify-center border-t-2 border-black">
            <p className="text-gray-400 italic text-sm">Tidak ada data untuk periode ini.</p>
          </div>
        ):(
          filteredItems.map((item,index)=>{
            const isReopenPending = pendingReopen.has(item.id_boxing);
            const reopenAction = getReopenAction(item.statusBoxing, item.statusReview);
            const statusInfo = isReopenPending
              ? { label: "⏳ Dipantau", cls: "bg-amber-100 text-amber-700", butuhAksiStaf: false }
              : item.isSelesai
                ? { label: "✓ Selesai", cls: "bg-green-100 text-green-700", butuhAksiStaf: false }
                : labelStatusLengkap(item.statusBoxing, item.statusReview, item.approvalStaf);
            return (
              <div key={`d-${item.id_boxing}-${index}`} className="flex min-w-175 border-t-2 border-black text-[11px]">
                <div className="w-10 border-r-2 border-black p-3 flex items-start justify-center">
                  <span className="font-bold text-sm">{index+1}</span>
                </div>
                <div className="flex-1 border-r-2 border-black p-3">
                  <p className="text-[9px] text-gray-400 italic mb-1">{item.kode}{item.unit!=="—"&&` · ${item.unit}`}</p>
                  <div className="border border-gray-400 p-2 h-20 font-bold text-[10px] overflow-auto uppercase">{item.uraian}</div>
                </div>
                <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                  <span className="italic text-gray-500 text-center text-[10px]">{item.penyebab}</span>
                </div>
                <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                  <span className="italic text-gray-500 text-center text-[10px]">{item.rencana}</span>
                </div>
                <div className="w-28 border-r-2 border-black p-3 flex items-center justify-center">
                  <span className={`text-[8px] font-bold text-center px-1.5 py-1 rounded leading-tight ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
                <div className="flex-1 border-r-2 border-black p-3">
                  <div className="border border-gray-400 p-2 h-20 italic text-gray-500 overflow-auto">
                    {item.tglPelaksanaan!=="—"&&<span className="block font-bold not-italic text-gray-700 mb-1 text-[9px]">{item.tglPelaksanaan}</span>}
                    {item.hasil}
                  </div>
                </div>
                <div className="w-32 p-3 flex flex-col justify-center gap-1.5">
                  {isReopenPending ? (
                    <span className="text-[9px] text-orange-600 font-bold text-center italic">⏳ Sedang ditindak ulang</span>
                  ) : statusInfo.butuhAksiStaf ? (
                    <span className="text-[9px] text-blue-600 italic text-center font-semibold">⏳ Menunggu keputusan Ka P4M</span>
                  ) : reopenAction ? (
                    <button onClick={()=>bukaLagi(item.id_boxing,reopenAction)}
                      className={`w-full border-2 text-[9px] font-bold py-1.5 leading-tight transition-all ${reopenAction==="ditindak_lanjut"?"border-orange-500 bg-orange-50 text-orange-800 hover:bg-orange-100":"border-gray-400 text-gray-600 hover:bg-gray-50"}`}>
                      {reopenAction==="ditindak_lanjut"?"↻ Tindak ulang":"↻ Buka ke Unit"}
                    </button>
                  ) : (
                    <span className="text-[9px] text-gray-400 italic text-center">Menunggu proses</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tabel — MOBILE card */}
      <div className="md:hidden w-full border-2 border-black bg-white text-xs">
        <div className="border-b-2 border-black px-3 py-2 bg-gray-50 text-[10px] font-bold uppercase text-gray-500">
          Daftar Laporan · {filteredItems.length} item
        </div>
        {filteredItems.length===0 ? (
          <div className="p-8 text-center text-gray-400 italic">Tidak ada data untuk periode ini.</div>
        ) : (
          filteredItems.map((item,index)=>{
            const isReopenPending = pendingReopen.has(item.id_boxing);
            const reopenAction = getReopenAction(item.statusBoxing, item.statusReview);
            const statusInfo = isReopenPending
              ? { label: "⏳ Dipantau", cls: "bg-amber-100 text-amber-700", butuhAksiStaf: false }
              : item.isSelesai
                ? { label: "✓ Selesai", cls: "bg-green-100 text-green-700", butuhAksiStaf: false }
                : labelStatusLengkap(item.statusBoxing, item.statusReview, item.approvalStaf);
            return (
              <div key={`m-${item.id_boxing}-${index}`} className="border-t-2 border-black p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[10px] font-bold text-gray-600">{index+1}. {item.kode}</span>
                    {item.unit!=="—"&&<span className="text-[10px] text-gray-400 ml-1">· {item.unit}</span>}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
                <div className="border border-gray-300 p-2 text-[11px] font-semibold uppercase bg-gray-50 rounded max-h-20 overflow-auto">
                  {item.uraian}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Penyebab</p>
                    <p className="text-[10px] italic text-gray-600 border border-gray-200 p-1.5 rounded min-h-10">{item.penyebab}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Rencana</p>
                    <p className="text-[10px] italic text-gray-600 border border-gray-200 p-1.5 rounded min-h-10">{item.rencana}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hasil Tindak Lanjut</p>
                  <div className="border border-gray-200 p-2 text-[10px] italic text-gray-600 rounded max-h-16 overflow-auto">
                    {item.tglPelaksanaan!=="—"&&<span className="block font-bold not-italic text-gray-700 mb-1">{item.tglPelaksanaan}</span>}
                    {item.hasil}
                  </div>
                </div>
                <div>
                  {isReopenPending ? (
                    <span className="text-[10px] text-orange-600 font-bold italic">⏳ Sedang ditindak ulang</span>
                  ) : statusInfo.butuhAksiStaf ? (
                    <span className="text-[10px] text-blue-600 italic font-semibold">⏳ Menunggu keputusan Ka P4M</span>
                  ) : reopenAction ? (
                    <button onClick={()=>bukaLagi(item.id_boxing,reopenAction)}
                      className={`w-full border-2 text-xs font-bold py-2 rounded transition-all ${reopenAction==="ditindak_lanjut"?"border-orange-500 bg-orange-50 text-orange-800":"border-gray-400 text-gray-600"}`}>
                      {reopenAction==="ditindak_lanjut"?"↻ Tindak ulang":"↻ Buka ke Unit"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Menunggu proses</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
