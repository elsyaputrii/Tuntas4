-- FILE: backend/database/add_arsip_rekapitulasi.sql
-- ============================================================
-- Migrasi: tabel arsip data rekapitulasi tahun-tahun lalu
--
-- Dipakai oleh fitur "Upload Data Lama" di halaman Rekapitulasi
-- (Staf P4M). Staf bisa mengunggah file Excel berisi data 1
-- sampai 10 tahun ke belakang, lalu data tsb ikut ditampilkan
-- rapi per tahun saat export Excel dibuat.
--
-- CARA PAKAI:
--   Jalankan file ini sekali di database `tuntas4` yang sudah
--   ada (lewat phpMyAdmin > Import, atau `mysql -u root -p
--   tuntas4 < add_arsip_rekapitulasi.sql`).
-- ============================================================

CREATE TABLE IF NOT EXISTS `arsip_rekapitulasi` (
  `id_arsip` int NOT NULL AUTO_INCREMENT,
  `tahun` int NOT NULL COMMENT 'Tahun data arsip, mis. 2024',
  `kode_laporan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_laporan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tgl_masuk` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Disimpan sbg teks krn format tanggal file lama bervariasi',
  `uraian_ketidaksesuaian` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penyebab` text COLLATE utf8mb4_unicode_ci,
  `rencana_tindakan` text COLLATE utf8mb4_unicode_ci,
  `hasil_tindakan` text COLLATE utf8mb4_unicode_ci,
  `tgl_pelaksanaan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_review` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_boxing` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_file_asal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama file excel yang diupload Staf',
  `diupload_oleh` int DEFAULT NULL COMMENT 'id_pengguna staf yang mengupload',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_arsip`),
  KEY `idx_arsip_tahun` (`tahun`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;