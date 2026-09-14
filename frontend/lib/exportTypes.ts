// FILE: frontend/lib/exportTypes.ts
// Tipe data bersama untuk exportExcel.ts dan exportPdf.ts

export interface RekapItem {
  id_laporan: number;
  id_boxing: number;
  kode_laporan: string;
  jenis_laporan: string | null;
  uraian_ketidaksesuaian: string | null;
  lampiran_laporan: string | null;
  status_laporan: string | null;
  status_boxing: string | null;
  nama_unit: string | null;
  status_review: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
  /** ✅ FIX: tanggal perencanaan (Penyebab & Rencana diisi Kepala Unit).
   *  Dikirim backend lewat getRekapitulasi (r.created_at AS tanggal_perencanaan). */
  tanggal_perencanaan?: string | null;
}

export interface ProsesItem {
  id_laporan: number;
  kode_laporan: string;
  id_boxing: number;
  jenis_laporan: string | null;
  isi_laporan: string | null;
  lampiran_laporan: string | null;
  status_laporan: string | null;
  nama_unit: string | null;
  status_boxing: string | null;
  status_review: string | null;
  aksi_masukan: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  catatan_kepala: string | null;
  hasil_tindakan: string | null;
  lampiran_hasil: string | null;
  tanggal_pelaksanaan: string | null;
  created_at?: string | null;
  /** ✅ "menunggu" | "diterima" | "ditolak" — dikirim backend lewat getProsesMonitor */
  approval_staf?: string | null;
  /** ✅ FIX: tanggal perencanaan (Penyebab & Rencana diisi Kepala Unit). */
  tanggal_perencanaan?: string | null;
}

export interface ArsipItem {
  tahun: number;
  kode_laporan: string | null;
  jenis_laporan: string | null;
  tgl_masuk: string | null;
  uraian_ketidaksesuaian: string | null;
  unit: string | null;
  penyebab: string | null;
  rencana_tindakan: string | null;
  hasil_tindakan: string | null;
  tgl_pelaksanaan: string | null;
  status_review: string | null;
  status_boxing: string | null;
}