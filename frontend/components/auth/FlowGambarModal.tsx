"use client";

import { X } from "lucide-react";

interface FlowGambarModalProps {
  onDone: () => void;
}

export default function FlowGambarModal({ onDone }: FlowGambarModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay gelap */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Kartu pop-up */}
      <div className="relative z-10 w-full max-w-lg bg-white p-6 rounded-2xl shadow-2xl">
        {/* 🔥 TOMBOL SILANG DI KANAN ATAS */}
        <button
          type="button"
          onClick={onDone}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Gambar flow */}
        <img
          src="/Flow Tuntas.jpg"
          alt="Panduan Flow"
          className="w-full rounded-lg"
        />

        {/* 🔥 BUTTON KECIL DI KIRI BAWAH — Panduan */}
        <a
          href="/manual_book_tuntas_.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-3 text-[10px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Panduan Pengguna
        </a>
      </div>
    </div>
  );
}