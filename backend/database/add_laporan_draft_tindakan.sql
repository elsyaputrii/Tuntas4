-- FILE: backend/database/add_laporan_draft_tindakan.sql
-- ============================================================
-- Migrasi: sinkronisasi Penyebab & Rencana Tindak Lanjut antar
-- Kepala Unit, untuk 1 laporan yang didistribusikan ke LEBIH DARI
-- SATU unit sekaligus (mis. Manajemen, P4M, P3M).
--
-- LATAR BELAKANG:
--   Satu `laporan_ketidaksesuaian` bisa punya banyak baris
--   `boxing_ketidaksesuaian` (1 baris per unit tujuan), dan tiap
--   baris boxing punya `rancangan_tindakan` (Penyebab + Rencana
--   Tindak Lanjut) sendiri-sendiri, terpisah per unit.
--
--   Supaya Kepala Unit tidak perlu mengetik ulang dari nol kalau
--   Kepala Unit lain (untuk laporan yang sama) sudah mengisi
--   Penyebab & Rencana duluan, kita simpan 1 "draft bersama" per
--   id_laporan di tabel ini. Draft ini dipakai sebagai NILAI AWAL
--   (masih bisa diedit bebas) untuk Kepala Unit lain yang BELUM
--   mengirim rancangan mereka sendiri.
--
--   Begitu seorang Kepala Unit klik "Kirim", rancangan MILIK unit
--   itu (di `rancangan_tindakan`) langsung terkunci seperti alur
--   lama (menunggu keputusan Ka P4M) — draft di tabel ini TIDAK
--   ikut mengunci punya unit lain, cuma dipakai sebagai bahan awal
--   yang tetap bisa mereka ubah sebelum mereka sendiri mengirim.
--
-- CARA PAKAI:
--   mysql -u root -p tuntas4 < database/add_laporan_draft_tindakan.sql
-- ============================================================

USE tuntas4;

CREATE TABLE IF NOT EXISTS `laporan_draft_tindakan` (
  `id_laporan`      INT NOT NULL,
  `penyebab`        TEXT NULL,
  `rencana`         TEXT NULL,
  `terakhir_diisi_unit` VARCHAR(100) NULL COMMENT 'Nama unit yang terakhir mengisi/mengubah draft ini',
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_laporan`),
  CONSTRAINT `fk_draft_tindakan_laporan`
    FOREIGN KEY (`id_laporan`) REFERENCES `laporan_ketidaksesuaian` (`id_laporan`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
