"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ImageModalProps {
  src: string;
  onClose: () => void;
}

export default function ImageModal({ src, onClose }: ImageModalProps) {
  const [scale, setScale]       = useState(1);
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posRef    = useRef(pos);

  // Sync posRef setiap kali pos berubah — harus di useEffect, bukan di render
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((prev) => {
      const next = prev - e.deltaY * 0.001;
      return Math.min(Math.max(next, 0.5), 5);
    });
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragStart.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function resetView() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  const isPdf = src.toLowerCase().includes(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-3 bg-black/50 px-4 py-2 rounded-full">
          <button
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition"
            title="Zoom Out"
          >
            −
          </button>

          <button
            onClick={resetView}
            className="text-white text-xs px-3 py-1 hover:bg-white/20 rounded-full transition"
            title="Reset"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
            className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition"
            title="Zoom In"
          >
            +
          </button>

          <div className="w-px h-5 bg-white/30" />

          {/* ✅ FIX DI SINI */}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-xs px-3 py-1 hover:bg-white/20 rounded-full transition"
            title="Buka di tab baru"
          >
            ↗ Buka
          </a>

          <button
            onClick={onClose}
            className="text-white text-sm font-bold px-3 py-1 bg-red-500/80 hover:bg-red-600 rounded-full transition flex items-center gap-1"
            title="Tutup"
          >
            ✕ Tutup
          </button>
        </div>

        {/* Gambar / PDF */}
        {isPdf ? (
          <iframe
            src={src}
            className="rounded-lg shadow-2xl"
            style={{ width: "min(720px, 90vw)", height: "min(1280px, 80vh)" }}
          />
        ) : (
          <div
            className="overflow-hidden rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
            style={{
              width:      "min(720px, 90vw)",
              height:     "min(500px, 80vh)",
              background: "#1a1a1a",
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              style={{
                transform:       `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: "center",
                transition:      dragging ? "none" : "transform 0.1s ease",
                width:           "100%",
                height:          "100%",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              <Image
                src={src}
                alt="Lampiran"
                width={720}
                height={500}
                className="object-contain select-none"
                draggable={false}
                unoptimized
              />
            </div>
          </div>
        )}

        <p className="text-white/40 text-xs mt-2">
          Scroll untuk zoom · Drag untuk geser · Esc untuk tutup
        </p>
      </div>
    </div>
  );
}