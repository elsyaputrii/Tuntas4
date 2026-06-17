"use client";
// FILE: frontend/components/staff-p4m/tables/RecapitulationTable.tsx
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
import { fmtTgl, getWeekNumber, sameDay, toLocalDate } from "@/lib/exportHelpers";
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
  const [filterMode,   setFilterMode]   = useState<FilterMode>("semua");
  const [exportingExcelLoading, setExportingExcelLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState<PdfKategori|null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [rekapRes, prosesRes] = await Promise.all([
        stafApi.getRekapitulasi(),
        stafApi.getProsesMonitor(),
      ]);
      setRekapData(rekapRes.data ?? []);
      setProsesData(prosesRes.data ?? []);
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
      statusReview:d.status_review??"", statusBoxing:d.status_boxing??"",
      tglMasuk:d.created_at??null, isSelesai:true,
    })),
    ...dipantauData.map(p=>({
      id_boxing:p.id_boxing, kode:p.kode_laporan, jenis:p.jenis_laporan??"—",
      uraian:p.isi_laporan??"—", unit:p.nama_unit??"—",
      penyebab:p.penyebab??"—", rencana:p.rencana_tindakan??"—",
      hasil:p.hasil_tindakan??"—", tglPelaksanaan:fmtTgl(p.tanggal_pelaksanaan),
      statusReview:p.status_review??"", statusBoxing:p.status_boxing??"",
      tglMasuk:p.created_at??null, isSelesai:false,
    })),
  ];

  const highlightedDates = new Set<string>(
    allItems.filter(d=>d.tglMasuk).map(d=>{
      const dt = toLocalDate(d.tglMasuk!); // ← fix timezone
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    })
  );

  function isInFilter(tglMasuk:string|null):boolean{
    if(filterMode==="semua") return true;
    if(!tglMasuk) return false;
    const d = toLocalDate(tglMasuk); // ← fix: pakai toLocalDate agar tidak geser timezone UTC→WIB
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

  async function bukaLagi(id_boxing:number, statusReview:string){
    const ok=confirm(statusReview==="ditindaklanjuti"?"Laporan akan ditindaklanjuti lagi. Lanjutkan?":"Laporan akan dibuka kembali. Lanjutkan?");
    if(!ok) return;
    try{
      const keputusan=statusReview==="ditindaklanjuti"?"ditindak_lanjut":"lanjut";
      const res=await stafApi.setKeputusanBoxing(id_boxing, keputusan as "ditindak_lanjut"|"lanjut");
      setMsg(res.message); setTimeout(()=>setMsg(""),5000); fetchData();
    }catch(err:unknown){
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

      {/* Baris atas: Kalender + Statistik */}
      <div className="flex flex-wrap gap-4">

        {/* Kolom kiri: Kalender + filter mode */}
        <div className="flex flex-col gap-3">
          <MiniCalendar selectedDate={selectedDate} onSelectDate={(d)=>{setSelectedDate(d);setFilterMode("harian");}} highlightedDates={highlightedDates}/>
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Filter Tampilan</p>
            <div className="flex flex-col gap-1">
              {(["semua","harian","mingguan","bulanan","tahunan"] as FilterMode[]).map(mode=>(
                <button key={mode} onClick={()=>setFilterMode(mode)}
                  className={`text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filterMode===mode?"bg-dark-header text-white":"hover:bg-gray-100 text-gray-600"}`}>
                  {mode==="semua"?"🗂 Semua":mode==="harian"?"📅 Harian":mode==="mingguan"?"📆 Mingguan":mode==="bulanan"?"🗓 Bulanan":"📊 Tahunan"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kolom kanan: Statistik + rekap status */}
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

      {/* Toolbar Export */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">📥 Export:</span>
        <button
          onClick={()=>{
            // Export Excel hanya data yang sudah difilter, bukan semua data
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
              // Fix bug cancel PDF: set spinner, panggil fungsi, lalu langsung reset
              // (tidak pakai setTimeout agar tidak stuck kalau user cancel cepat/lambat)
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

      {/* Tabel Rekapitulasi */}
      <div className="w-full border-2 border-black bg-white overflow-x-auto text-xs">
        <div className="flex min-w-275 font-bold uppercase bg-gray-50 border-b-2 border-black text-center text-[10px]">
          <div className="w-10 border-r-2 border-black p-2">No</div>
          <div className="flex-1 border-r-2 border-black p-2">Uraian Ketidaksesuaian</div>
          <div className="w-36 border-r-2 border-black p-2">Penyebab</div>
          <div className="w-36 border-r-2 border-black p-2">Rencana</div>
          <div className="w-20 border-r-2 border-black p-2">Status</div>
          <div className="flex-1 border-r-2 border-black p-2">Hasil Tindak Lanjut</div>
          <div className="w-28 p-2">Tindakan</div>
        </div>

        {filteredItems.length===0?(
          <div className="flex min-w-275 p-8 justify-center border-t-2 border-black">
            <p className="text-gray-400 italic text-sm">Tidak ada data untuk periode ini.</p>
          </div>
        ):(
          filteredItems.map((item,index)=>(
            <div key={`${item.id_boxing}-${index}`} className="flex min-w-275 border-t-2 border-black text-[11px]">
              <div className="w-10 border-r-2 border-black p-3 flex items-start justify-center">
                <span className="font-bold text-sm">{index+1}</span>
              </div>
              <div className="flex-1 border-r-2 border-black p-3">
                <p className="text-[9px] text-gray-400 italic mb-1 flex items-center gap-1 flex-wrap">
                  <span>{item.kode}</span>
                  {item.unit!=="—"&&<span>· {item.unit}</span>}
                  <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${item.isSelesai?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                    {item.isSelesai?"Selesai":"Dipantau"}
                  </span>
                </p>
                <div className="border border-gray-400 p-2 h-20 font-bold text-[10px] overflow-auto uppercase">{item.uraian}</div>
              </div>
              <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                <span className="italic text-gray-500 text-center text-[10px]">{item.penyebab}</span>
              </div>
              <div className="w-36 border-r-2 border-black p-3 flex items-center justify-center">
                <span className="italic text-gray-500 text-center text-[10px]">{item.rencana}</span>
              </div>
              <div className="w-20 border-r-2 border-black p-3 flex items-center justify-center">
                <span className={`text-[8px] font-bold text-center px-1 py-0.5 rounded ${
                  item.statusReview==="ditindaklanjuti"?"bg-green-100 text-green-700":
                  item.statusReview==="tidak_ditindaklanjuti"?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700"
                }`}>
                  {item.statusReview==="ditindaklanjuti"?"✓ Ditindak":item.statusReview==="tidak_ditindaklanjuti"?"✗ Tidak":"⏳ Proses"}
                </span>
              </div>
              <div className="flex-1 border-r-2 border-black p-3">
                <div className="border border-gray-400 p-2 h-20 italic text-gray-500 overflow-auto">
                  {item.tglPelaksanaan!=="—"&&<span className="block font-bold not-italic text-gray-700 mb-1 text-[9px]">{item.tglPelaksanaan}</span>}
                  {item.hasil}
                </div>
              </div>
              <div className="w-28 p-3 flex flex-col justify-center gap-1.5">
                {item.isSelesai?(
                  <button onClick={()=>bukaLagi(item.id_boxing,item.statusReview)}
                    className={`w-full border-2 text-[9px] font-bold py-1.5 leading-tight transition-all ${
                      item.statusReview==="ditindaklanjuti"
                        ?"border-orange-500 bg-orange-50 text-orange-800 hover:bg-orange-100"
                        :"border-gray-400 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {item.statusReview==="ditindaklanjuti"?"↻ Tindak lagi":"↻ Buka"}
                  </button>
                ):(
                  <span className="text-[9px] text-amber-600 font-bold text-center">⏳ Dipantau</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}