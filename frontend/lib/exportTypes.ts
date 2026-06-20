// FILE: frontend/lib/exportTypes.ts
// Tipe data bersama untuk exportExcel.ts dan exportPdf.ts
//
// ✅ FIX: ditambahkan field `approval_staf` pada ProsesItem.
// Backend (stafController.js → getProsesMonitor) SUDAH mengirim kolom
// b.approval_staf di setiap baris, tapi tipe TypeScript di sini belum
// mendeklarasikannya — akibatnya RecapitulationTable.tsx tidak bisa
// membaca status approval Staf P4M sama sekali dan menampilkan semua
// laporan yang belum "selesai" dengan label generik "Dipantau", padahal
// banyak di antaranya sebenarnya sudah berada di tahap "menunggu approval
// Staf P4M" (status_boxing = 'di_staff', approval_staf = 'menunggu').

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
  /** ✅ BARU: "menunggu" | "diterima" | "ditolak" — dikirim backend tapi sebelumnya tidak ada di tipe ini */
  approval_staf?: string | null;
}