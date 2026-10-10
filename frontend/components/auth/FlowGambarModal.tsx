"use client";

import { X } from "lucide-react";

interface FlowGambarModalProps {
  onDone: () => void;
}

export default function FlowGambarModal({ onDone }: FlowGambarModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay gelap */}
      <div className="absolute inset-0 bg-black/60" onClick={onDone} />

      {/* Kartu pop-up */}
      {/* 🔥 DIUBAH: max-w-lg -> max-w-4xl, ditambah max-h-[90vh] & flex-col */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* 🔥 TOMBOL SILANG DI KANAN ATAS */}
        <button
          type="button"
          onClick={onDone}
          aria-label="Tutup"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-100/80 backdrop-blur-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
        >
          <X size={20} />
        </button>

        {/* 🔥 AREA GAMBAR YANG BISA DI-SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 pt-14 pb-16">
          <img
            src="/FLOW.jpg"
            alt="Panduan Flow"
            className="w-full h-auto rounded-lg object-contain"
          />
        </div>

        {/* 🔥 BUTTON KECIL DI KIRI BAWAH — Panduan */}
        <a
          href="/manual-book.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-4 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm z-20"
        >
          Panduan Pengguna
        </a>
      </div>
    </div>
  );
}