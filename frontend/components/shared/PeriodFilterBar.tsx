"use client";
// FILE: frontend/components/shared/PeriodFilterBar.tsx
//
// Komponen filter periode (Harian / Mingguan / Bulanan / Tahunan / Semua)
// yang dipakai bareng di Rekapitulasi, Laporan Masuk, dan Proses & Pantau,
// supaya ketiga halaman itu punya pengalaman filter yang sama persis.
// Diekstrak dari RecapitulationTable.tsx — logikanya tidak diubah, cuma
// dipindah ke sini supaya bisa dipakai ulang (reusable).

import { useState } from "react";
import {
  sameDay, sameWeekOfMonth, getWeekOfMonth, getMonthWeeks,
} from "@/lib/exportHelpers";

export const BULAN_PANJANG = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

export type FilterMode = "semua" | "harian" | "mingguan" | "bulanan" | "tahunan";

/** Cek apakah suatu tanggal (ISO/string tanggal) masuk ke periode filter
 *  yang sedang aktif. Dipakai sama di semua tabel yang punya filter periode. */
export function isInPeriodFilter(
  filterMode: FilterMode,
  selectedDate: Date,
  toLocalDate: (v: string) => Date,
  tgl: string | null | undefined
): boolean {
  if (filterMode === "semua") return true;
  if (!tgl) return false;
  const d = toLocalDate(tgl);
  if (filterMode === "harian") return sameDay(d, selectedDate);
  if (filterMode === "mingguan") return sameWeekOfMonth(d, selectedDate);
  if (filterMode === "bulanan") return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth();
  return d.getFullYear() === selectedDate.getFullYear();
}

/** Label periode yang sedang aktif, buat ditampilkan mis. "12 laporan · Juli 2026" */
export function labelPeriodFilter(filterMode: FilterMode, selectedDate: Date, fmtTgl: (v: string) => string): string {
  if (filterMode === "semua") return "Semua Waktu";
  if (filterMode === "harian") return fmtTgl(selectedDate.toISOString());
  if (filterMode === "mingguan") {
    const { weekNum, start, end } = getWeekOfMonth(selectedDate);
    return `Minggu ${weekNum} · ${start.getDate()}–${end.getDate()} ${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }
  if (filterMode === "bulanan") return `${BULAN_PANJANG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  return `Tahun ${selectedDate.getFullYear()}`;
}

// ══════════════════════════════════════════════════════════
// KOMPONEN KALENDER & PICKER PERIODE
// ══════════════════════════════════════════════════════════

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

interface MonthYearPickerProps {
  selectedDate: Date;
  onChange: (d: Date) => void;
}

/** Picker Bulan + Tahun untuk mode "bulanan" — tidak bisa melewati bulan berjalan */
function MonthYearPicker({ selectedDate, onChange }: MonthYearPickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
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
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
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

// ══════════════════════════════════════════════════════════
// KOMPONEN UTAMA — PeriodFilterBar
// ══════════════════════════════════════════════════════════

interface PeriodFilterBarProps {
  filterMode: FilterMode;
  onFilterModeChange: (m: FilterMode) => void;
  selectedDate: Date;
  onSelectedDateChange: (d: Date) => void;
  highlightedDates: Set<string>;
  /** Konten statistik/tabel yang mau ditaruh di sebelah kanan sidebar
   *  kalender (opsional) — kalau tidak diisi, sidebar tetap tampil sendiri. */
  children?: React.ReactNode;
  /** Tampilkan kalender kotak-kotak (grid) di bawah dropdown picker.
   *  Default true. Set false kalau cuma butuh pill filter + dropdown
   *  picker saja tanpa kalendernya (mis. di Laporan Masuk / Proses & Pantau). */
  showCalendar?: boolean;
}

/** Baris pill filter (Harian/Mingguan/Bulanan/Tahunan/Semua) + sidebar
 *  kalender & dropdown picker periode. Sama persis dengan yang ada di
 *  halaman Rekapitulasi, supaya Laporan Masuk dan Proses & Pantau punya
 *  cara filter yang konsisten. */
export function PeriodFilterBar({
  filterMode, onFilterModeChange,
  selectedDate, onSelectedDateChange,
  highlightedDates, children,
  showCalendar = true,
}: PeriodFilterBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [calendarResetKey, setCalendarResetKey] = useState(0);

  return (
    <div className="space-y-4">
      {/* Filter pill — scroll horizontal di HP */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["harian","mingguan","bulanan","tahunan","semua"] as FilterMode[]).map(mode=>(
          <button key={mode} onClick={()=>{ onFilterModeChange(mode); setCalendarResetKey(k=>k+1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all
              ${filterMode===mode?"bg-dark-header text-white border-dark-header shadow":"bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            {mode==="semua"?"📋 Semua":mode==="harian"?"📅 Harian":mode==="mingguan"?"🗓️ Mingguan":mode==="bulanan"?"📆 Bulanan":"🗃️ Tahunan"}
          </button>
        ))}
      </div>

      {/* Toggle picker periode — mobile only. Kalau filterMode "semua" nggak
          ada picker apa-apa buat ditampilkan, jadi tombolnya disembunyikan. */}
      {filterMode !== "semua" && (
        <button
          onClick={()=>setShowPicker(v=>!v)}
          className="sm:hidden w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 shadow-sm"
        >
          <span>📅 {showPicker ? "Sembunyikan Filter" : (showCalendar ? "Kalender & Filter Periode" : "Filter Periode")}</span>
          <span>{showPicker ? "▲" : "▼"}</span>
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar: dropdown picker sesuai mode filter yang aktif, ditambah
            kalender kotak-kotak kalau showCalendar true. */}
        <div className={`${showPicker ? "block" : "hidden"} sm:block sm:w-56 md:w-60 shrink-0 space-y-3`}>
          {filterMode === "harian" && (
            <DailyPicker selectedDate={selectedDate} onChange={onSelectedDateChange} />
          )}
          {filterMode === "mingguan" && (
            <WeeklyPicker selectedDate={selectedDate} onChange={onSelectedDateChange} />
          )}
          {filterMode === "bulanan" && (
            <MonthYearPicker selectedDate={selectedDate} onChange={onSelectedDateChange} />
          )}
          {filterMode === "tahunan" && (
            <YearPicker selectedDate={selectedDate} onChange={onSelectedDateChange} />
          )}
          {showCalendar && (
            <MiniCalendar
              key={calendarResetKey}
              selectedDate={selectedDate}
              onSelectDate={(d)=>{ onSelectedDateChange(d); onFilterModeChange("harian"); }}
              highlightedDates={highlightedDates}
            />
          )}
        </div>

        {children && (
          <div className="flex-1 min-w-0 space-y-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}