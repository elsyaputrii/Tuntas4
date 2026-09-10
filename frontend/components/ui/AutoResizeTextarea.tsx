// FILE: frontend/components/ui/AutoResizeTextarea.tsx
//
// Textarea yang tingginya otomatis mengikuti panjang teks di dalamnya
// (tumbuh ke bawah), bukan kotak kecil dengan tinggi tetap + scroll.
//
// Dipakai di:
//  - Kepala Unit → Ketidaksesuaian Masuk (Penyebab & Rencana Tindak Lanjut)
//  - Ka P4M → Proses Pengaduan (Penyebab & Rencana Unit, read-only)
//  - Kepala Unit → Laporan Hasil (Uraian Hasil Tindak Lanjut)
//
// Cara kerja: setiap kali `value` berubah (baik karena user mengetik atau
// karena data baru datang dari API), tinggi elemen di-reset ke "auto" lalu
// disamakan dengan scrollHeight-nya. Tidak pakai library luar supaya
// ringan dan konsisten dengan textarea bawaan React.
"use client";

import { forwardRef, TextareaHTMLAttributes, useEffect, useRef } from "react";

function useMergedRef<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

interface AutoResizeTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number; // px, tinggi minimum supaya kotak kosong tidak terlalu ceper
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minHeight = 96, className = "", value, onChange, style, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useMergedRef<HTMLTextAreaElement>(innerRef, forwardedRef);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
    };

    // Sesuaikan tinggi tiap kali value berubah (termasuk saat data awal
    // dari API masuk, bukan cuma saat user mengetik).
    useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <textarea
        ref={setRefs}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        rows={1}
        className={`resize-none overflow-hidden ${className}`}
        style={{ minHeight: `${minHeight}px`, ...style }}
        {...rest}
      />
    );
  },
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;
