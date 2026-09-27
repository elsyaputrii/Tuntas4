// FILE: frontend/components/notifikasi/NotifikasiBell.tsx
//
// Komponen lonceng notifikasi — dipakai di navbar ka-p4m, staff-p4m,
// dan kepala-unit (satu komponen, dipakai 3 kali). Poll unread-count
// tiap 20 detik, dan ambil daftar notifikasi tiap kali dropdown dibuka.

"use client";

import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { notifikasiApi } from "@/lib/api";

interface NotifikasiItem {
  id_notifikasi: number;
  judul: string;
  pesan: string;
  jenis: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

const POLL_MS = 20000;

function waktuRelatif(iso: string): string {
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return "Baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export default function NotifikasiBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifikasiItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notifikasiApi.getUnreadCount();
      setUnread(res?.data?.unread ?? 0);
    } catch {
      // diam-diam gagal saja, jangan ganggu UI kalau polling gagal
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notifikasiApi.getList();
      // Hanya tampilkan yang belum dibaca — begitu ditandai dibaca
      // (lewat "Lihat notifikasi lengkap" atau "Lihat Semua"), notifikasi
      // itu tidak akan muncul lagi meskipun dropdown dibuka ulang.
      const belumDibaca = (res?.data ?? []).filter(
        (it: NotifikasiItem) => !it.is_read
      );
      setItems(belumDibaca);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling badge count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Klik di luar dropdown → tutup
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  }

  // Diklik dari link "Lihat notifikasi lengkap" pada 1 notifikasi:
  // notifikasi itu langsung HILANG dari daftar (bukan cuma berubah gaya),
  // lalu (kalau ada link tujuan) diarahkan ke halaman terkait.
  async function handleViewFull(e: ReactMouseEvent, item: NotifikasiItem) {
    e.stopPropagation();
    setItems((prev) => prev.filter((it) => it.id_notifikasi !== item.id_notifikasi));
    if (!item.is_read) setUnread((prev) => Math.max(0, prev - 1));
    notifikasiApi.markAsRead(item.id_notifikasi).catch(() => {});
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  // Diklik dari tombol "Lihat Semua" di footer dropdown:
  // SEMUA notifikasi yang masuk hilang sekaligus dari daftar.
  async function handleSeeAll() {
    setItems([]);
    setUnread(0);
    try {
      await notifikasiApi.markAllAsRead();
    } catch {
      // biarin, daftar tetap kosong secara optimis
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
          <div className="p-3 border-b dark:border-slate-700 flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-white">Notifikasi</span>
            <button onClick={() => setOpen(false)}>
              <X size={16} className="text-slate-700 dark:text-white" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Memuat...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada notifikasi</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id_notifikasi}
                  className="w-full text-left px-4 py-3 border-b last:border-b-0 dark:border-slate-700 bg-blue-50 dark:bg-slate-700/30 flex gap-2"
                >
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {item.judul}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                      {item.pesan}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-slate-400">
                        {waktuRelatif(item.created_at)}
                      </p>
                      <button
                        onClick={(e) => handleViewFull(e, item)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Lihat notifikasi lengkap
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t dark:border-slate-700">
              <button
                onClick={handleSeeAll}
                className="w-full py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-b-xl transition"
              >
                Lihat Semua
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}