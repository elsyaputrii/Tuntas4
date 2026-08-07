// FILE: frontend/components/notifikasi/NotifikasiBell.tsx
//
// Komponen lonceng notifikasi — dipakai di navbar ka-p4m, staff-p4m,
// dan kepala-unit (satu komponen, dipakai 3 kali). Poll unread-count
// tiap 20 detik, dan ambil daftar notifikasi tiap kali dropdown dibuka.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
      setItems(res?.data ?? []);
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

  async function handleClickItem(item: NotifikasiItem) {
    if (!item.is_read) {
      setItems((prev) =>
        prev.map((it) => (it.id_notifikasi === item.id_notifikasi ? { ...it, is_read: 1 } : it))
      );
      setUnread((prev) => Math.max(0, prev - 1));
      notifikasiApi.markAsRead(item.id_notifikasi).catch(() => {});
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((it) => ({ ...it, is_read: 1 })));
    setUnread(0);
    try {
      await notifikasiApi.markAllAsRead();
    } catch {
      // biarin, badge tetap ke-update secara optimis
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
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X size={16} className="text-slate-700 dark:text-white" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Memuat...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada notifikasi</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id_notifikasi}
                  onClick={() => handleClickItem(item)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition flex gap-2 ${
                    !item.is_read ? "bg-blue-50 dark:bg-slate-700/30" : ""
                  }`}
                >
                  {!item.is_read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <div className={!item.is_read ? "" : "pl-4"}>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {item.judul}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {item.pesan}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {waktuRelatif(item.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}