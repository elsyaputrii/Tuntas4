"use client";
// FILE: frontend/components/staff-p4m/tables/RecapitulationTable.tsx
//
// ── CATATAN PERBAIKAN (revisi ke-3 — final) ─────────────────────────────
//
// 1. [BUG FIX] Tombol reopen ("↻ Tindak ulang") sebelumnya muncul HANYA
//    berdasarkan status_review, tanpa cek status_boxing → bisa muncul
//    untuk kombinasi status yang DITOLAK backend. FIX: getReopenAction()
//    dari exportHelpers.ts meniru 1:1 validasi backend.
//
// 2. [BUG FIX - kalender] toLocalDate() di exportHelpers.ts diperbaiki
//    supaya konversi UTC→lokal benar (laporan dini hari WIB tidak lagi
//    nyangkut di tanggal kemarin).
//
// 3. [BUG FIX - cascading render] MiniCalendar tidak lagi pakai useEffect
//    untuk sync viewDate; sekarang pakai key reset dari parent.
//
// 4. [FIX UTAMA] Label status "⏳ Dipantau" generik DIGANTI dengan label
//    akurat berdasarkan tahap sebenarnya (labelStatusLengkap() di
//    exportHelpers.ts):
//      - "⏳ Menunggu Approval Staf" → Kepala Unit sudah kerja, tinggal
//        Staf approve/tolak (tombol ✓/✗ langsung ada di kolom Tindakan,
//        tidak perlu pindah ke tab "Proses & Pantau" lagi).
//      - "✗ Ditolak — Revisi Unit" → Staf sudah tolak, menunggu Kepala
//        Unit revisi di tab "Laporan Hasil".
//      - "🔄 Diproses Kepala Unit" / "⏳ Menunggu Ka P4M" → masih di
//        siklus awal sebelum sampai ke Staf.
//      - "✓ Selesai" → backend SEKARANG otomatis set ini begitu Staf
//        klik ✓ (diterima) — lihat fix di stafController.js.
//
// 5. [FITUR BARU] Tombol "↻ Tindak ulang" di kolom Tindakan: begitu
//    diklik, baris itu MASUK STATE OPTIMISTIC lokal (tanpa nunggu
//    refetch dari server) → kolom Tindakan langsung berubah jadi teks
//    "⏳ Sedang ditindak ulang" dan kolom Status langsung berubah jadi
//    badge kuning "Dipantau", supaya Staf P4M dapat feedback instan
//    bahwa aksinya berhasil terkirim. Begitu fetchData() selesai, state
//    optimistic ini otomatis dibuang (data asli dari server mengambil
//    alih) — laporan akan benar-benar berstatus "🔄 Diproses Kepala Unit"
//    begitu Kepala Unit membuka tab "Ketidaksesuaian Masuk"-nya.
//
// Fitur:
//  1. Statistik ringkasan (total, selesai, dipantau, ditindaklanjuti, belum)
//  2. Kalender interaktif → klik tanggal untuk filter
//  3. Tabel rekap status (sudah vs belum ditindaklanjuti)
//  4. Export EXCEL  → semua laporan (selesai + dipantau) via exportExcel.ts
//  5. Export PDF    → per harian/mingguan/bulanan/tahunan via exportPdf.ts

import { useState, useEffect, useCallback } from "react";
import { stafApi } from "@/lib/api";
import { exportExcel } from "@/lib/exportExcel";
import { exportPDFRekap, type PdfKategori } from "@/lib/exportPdf";
import {
  fmtTgl,
  getWeekNumber,
  sameDay,
  toLocalDate,
  getReopenAction,
  labelStatusLengkap,
} from "@/lib/exportHelpers";
import type { RekapItem, ProsesItem } from "@/lib/exportTypes";

const BULAN_PANJANG = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ─── Kalender Mini ─────────────────────────────────────────────────────────
interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  highlightedDates: Set<string>;
}

function MiniCalendar({ selectedDate, onSelectDate, highlightedDates }: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const rawFirstDay = new Date(year, month, 1).getDay();
  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm" style={{minWidth:228}}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={()=>setViewDate(new Date(year,month-1,1))}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold">‹</button>
        <span className="text-xs font-semibold text-gray-700">{BULAN_PANJANG[month]} {year}</span>
        <button onClick={()=>setViewDate(new Date(year,month+1,1))}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold">›</button>
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
          return (
            <button key={day} onClick={()=>onSelectDate(new Date(year,month,day))}
              className={`w-7 h-7 text-[10px] rounded-full flex items-center justify-center mx-auto relative transition-all
                ${isSelected?"bg-dark-header text-white font-bold":isToday?"bg-blue-100 text-blue-700 font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
              {day}
              {hasData&&<span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected?"bg-white/70":"bg-blue-polibatam"}`}/>}
            </button>
          );
        })}
      </div>
      <button onClick={()=>{setViewDate(new Date());onSelectDate(new Date());}}
        className="w-full mt-2 text-[10px] text-dark-header font-semibold hover:underline">Hari Ini</button>
    </div>
  );
}

// ─── Komponen Utama ─────────────────────────────────────────────────────────
type FilterMode = "semua"|"harian"|"mingguan"|"bulanan"|"tahunan";

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
  const [pendingApproval, setPendingApproval] = useState<Record<number, "diterima"|"ditolak">>({});
  const [pendingReopen, setPendingReopen] = useState<Set<number>>(new Set());

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
    if(filterMode==="mingguan") return d.getFullYear()===selectedDate.getFullYear()&&getWeekNumber(d)===getWeekNumber(selectedDate);
    if(filterMode==="bulanan")  return d.getFullYear()===selectedDate.getFullYear()&&d.getMonth()===selectedDate.getMonth();
    return d.getFullYear()===selectedDate.getFullYear();
  }

  const filteredItems   = allItems.filter(d=>isInFilter(d.tglMasuk));
  const totalAll        = filteredItems.length;
  const selesaiCount    = filteredItems.filter(d=>d.isSelesai).length;
  const dipantauCount   = filteredItems.filter(d=>!d.isSelesai).length;
  const ditindakCount   = filteredItems.filter(d=>d.statusReview==="ditindaklanjuti").length;
  const tidakDitindak   = filteredItems.filter(d=>d.statusReview==="tidak_ditindaklanjuti").length;
  const menungguCount   = filteredItems.filter(d=>!["ditindaklanjuti","tidak_ditindaklanjuti"].includes(d.statusReview)).length;

  const labelFilter:Record<FilterMode,string>={
    semua:"Semua Waktu", harian:fmtTgl(selectedDate.toISOString()),
    mingguan:`Minggu ke-${getWeekNumber(selectedDate)} / ${selectedDate.getFullYear()}`,
    bulanan:`${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`,
    tahunan:`Tahun ${selectedDate.getFullYear()}`,
  };

  async function bukaLagi(id_boxing:number, aksi: "ditindak_lanjut" | "lanjut"){
    const ok=confirm("Laporan akan dibuka kembali dari awal ke Kepala Unit (mulai dari Ketidaksesuaian Masuk). Lanjutkan?");
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

  async function approvalStaf(id_boxing: number, approval: "diterima" | "ditolak") {
    setPendingApproval(prev => ({ ...prev, [id_boxing]: approval }));
    setError("");
    try {
      const res = await stafApi.setApprovalBoxing(id_boxing, approval);
      setMsg(res.message);
      setTimeout(() => setMsg(""), 4000);
      fetchData();
    } catch (err: unknown) {
      setPendingApproval(prev => { const n = { ...prev }; delete n[id_boxing]; return n; });
      setError(err instanceof Error ? err.message : "Gagal menyimpan approval.");
      setTimeout(() => setError(""), 4000);
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

      <div className="flex flex-wrap gap-4">

        <div className="flex flex-col gap-3">
          <MiniCalendar
            key={calendarResetKey}
            selectedDate={selectedDate}
            onSelectDate={(d)=>{setSelectedDate(d);setFilterMode("harian");}}
            highlightedDates={highlightedDates}
          />
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Filter Tampilan</p>
            <div className="flex flex-col gap-1">
              {(["semua","harian","mingguan","bulanan","tahunan"] as FilterMode[]).map(mode=>(
                <button key={mode} onClick={()=>{
                    setFilterMode(mode);
                    if (mode !== "harian") setCalendarResetKey(k => k + 1);
                  }}
                  className={`text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterMode===mode?"bg-dark-header text-white":"hover:bg-gray-100 text-gray-600"}`}>
                  {mode==="semua"?"🗂 Semua":mode==="harian"?"📅 Harian":mode==="mingguan"?"📆 Mingguan":mode==="bulanan"?"🗓 Bulanan":"📊 Tahunan"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-500 uppercase mb-3">📊 Statistik — {labelFilter[filterMode]}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {label:"Total Laporan",val:totalAll,color:"text-[#4d5e71]",bg:"bg-slate-50 border-slate-200"},
                {label:"Selesai",val:selesaiCount,color:"text-green-700",bg:"bg-green-50 border-green-200"},
                {label:"Dipantau",val:dipantauCount,color:"text-amber-700",bg:"bg-amber-50 border-amber-200"},
                {label:"Ditindaklanjuti",val:ditindakCount,color:"text-blue-700",bg:"bg-blue-50 border-blue-200"},
                {label:"Belum Ditindak",val:tidakDitindak+menungguCount,color:"text-red-700",bg:"bg-red-50 border-red-200"},
              ].map(s=>(
                <div key={s.label} className={`border rounded-xl p-3 ${s.bg}`}>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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

      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">📥 Export:</span>
        <button
          onClick={()=>{
            const filteredRekap   = rekapData.filter(d=>isInFilter(d.created_at??null));
            const filteredDipantau = prosesData.filter(p=>{
              const selesaiIds=new Set(rekapData.map(d=>d.id_boxing));
              return !selesaiIds.has(p.id_boxing)&&isInFilter(p.created_at??null);
            });
            setExportingExcelLoading(true);
            exportExcel(filteredRekap, filteredDipantau);
            setTimeout(()=>setExportingExcelLoading(false),1200);
          }}
          disabled={exportingExcelLoading||filteredItems.length===0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white text-[10px] font-bold rounded transition-all">
          {exportingExcelLoading?<span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:"📊"} Excel ({filterMode==="semua"?"Semua":labelFilter[filterMode]})
        </button>
        <span className="text-[9px] text-gray-400 ml-1">PDF per periode:</span>
        {(["harian","mingguan","bulanan","tahunan"] as PdfKategori[]).map(kat=>(
          <button key={kat}
            onClick={()=>{
              setExportingPDF(kat);
              exportPDFRekap(rekapData,prosesData,kat,selectedDate);
              setExportingPDF(null);
            }}
            disabled={exportingPDF===kat}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[10px] font-bold rounded transition-all">
            {"📄"}
            {kat.charAt(0).toUpperCase()+kat.slice(1)}
          </button>
        ))}
        <span className="text-[9px] text-gray-400 ml-auto italic">
          {filteredItems.length} laporan · {labelFilter[filterMode]}
        </span>
      </div>

      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <div className="flex min-w-275 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="w-10 border-r-2 border-black p-2">No</div>
          <div className="flex-1 border-r-2 border-black p-2">Uraian Ketidaksesuaian</div>
          <div className="w-36 border-r-2 border-black p-2">Penyebab</div>
          <div className="w-36 border-r-2 border-black p-2">Rencana</div>
          <div className="w-28 border-r-2 border-black p-2">Status</div>
          <div className="flex-1 border-r-2 border-black p-2">Hasil Tindak Lanjut</div>
          <div className="w-32 p-2">Tindakan</div>
        </div>

        {filteredItems.length===0?(
          <div className="flex min-w-275 p-8 justify-center border-t-2 border-black">
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

            const pendingAppr = pendingApproval[item.id_boxing];

            return (
            <div key={`${item.id_boxing}-${index}`} className="flex min-w-275 border-t-2 border-black text-[11px]">
              <div className="w-10 border-r-2 border-black p-3 flex items-start justify-center">
                <span className="font-bold text-sm">{index+1}</span>
              </div>
              <div className="flex-1 border-r-2 border-black p-3">
                <p className="text-[9px] text-gray-400 italic mb-1 flex items-center gap-1 flex-wrap">
                  <span>{item.kode}</span>
                  {item.unit!=="—"&&<span>· {item.unit}</span>}
                </p>
                <div className="border border-gray-400 p-2 h-20 font-bold text-[10px] overflow-auto uppercase">{item.uraian}</div>
              </div>
              <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                <span className="italic text-gray-500 text-center text-[10px]">{item.penyebab}</span>
              </div>
              <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                <span className="italic text-gray-500 text-center text-[10px]">{item.rencana}</span>
              </div>

              <div className="w-28 border-r-2 border-black p-3 flex flex-col items-center justify-center gap-1">
                <span
                  title={statusInfo.butuhAksiStaf ? "Kepala Unit sudah selesai mengerjakan. Menunggu kamu approve/tolak." : undefined}
                  className={`text-[8px] font-bold text-center px-1.5 py-1 rounded leading-tight ${statusInfo.cls} ${statusInfo.butuhAksiStaf ? "cursor-help" : ""}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex-1 border-r-2 border-black p-3">
                <div className="border border-gray-400 p-2 h-20 italic text-gray-500 overflow-auto">
                  {item.tglPelaksanaan!=="—"&&<span className="block font-bold not-italic text-gray-700 mb-1 text-[9px]">{item.tglPelaksanaan}</span>}
                  {item.hasil}
                </div>
              </div>

              <div className="w-32 p-3 flex flex-col justify-center gap-1.5">
                {isReopenPending ? (
                  <span className="text-[9px] text-orange-600 font-bold text-center italic">
                    ⏳ Sedang ditindak ulang
                  </span>
                ) : statusInfo.butuhAksiStaf ? (
                  pendingAppr ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border text-center ${
                      pendingAppr === "diterima" ? "text-green-700 bg-green-50 border-green-300" : "text-red-700 bg-red-50 border-red-300"
                    }`}>
                      {pendingAppr === "diterima" ? "✓ Disetujui" : "✗ Ditolak"}
                    </span>
                  ) : (
                    <div className="flex gap-1.5 justify-center">
                      <button type="button" onClick={() => approvalStaf(item.id_boxing, "diterima")}
                        title="Terima hasil — laporan otomatis Selesai"
                        className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white text-base font-bold flex items-center justify-center shadow">
                        ✓
                      </button>
                      <button type="button" onClick={() => approvalStaf(item.id_boxing, "ditolak")}
                        title="Tolak — kembalikan ke unit untuk revisi"
                        className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white text-base font-bold flex items-center justify-center shadow">
                        ✗
                      </button>
                    </div>
                  )
                ) : reopenAction ? (
                  <button onClick={()=>bukaLagi(item.id_boxing,reopenAction)}
                    className={`w-full border-2 text-[9px] font-bold py-1.5 leading-tight transition-all ${
                      reopenAction==="ditindak_lanjut"
                        ?"border-orange-500 bg-orange-50 text-orange-800 hover:bg-orange-100"
                        :"border-gray-400 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {reopenAction==="ditindak_lanjut"?"↻ Tindak ulang":"↻ Buka ke Unit"}
                  </button>
                ) : (
                  <span
                    title="Laporan masih berjalan di tahap Kepala Unit / Ka P4M."
                    className="text-[9px] text-gray-400 italic text-center cursor-help">
                    Menunggu proses
                  </span>
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