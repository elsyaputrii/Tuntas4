-- ============================================================
-- MIGRASI: kode_laporan acak (anti-enumerasi)
-- Jalankan LANGSUNG di phpMyAdmin / mysql client di server produksi.
-- Sudah disesuaikan dengan isi DB kamu saat ini (2 baris laporan:
-- id_laporan 1 dan 2, dari dump tuntas4__4_.sql yang kamu kirim).
--
-- Kalau nanti ternyata sudah ada laporan baru masuk lewat kode LAMA
-- (sebelum kamu sempat deploy backend baru), jalankan lagi query SELECT
-- di paling bawah untuk cek apakah masih ada baris kode_laporan kosong,
-- lalu isi manual seperti pola di bawah (atau pakai
-- backend/scripts/migrateKodeLaporan.js yang otomatis untuk jumlah baris
-- berapa pun -- lebih aman dipakai kalau datanya sudah bertambah banyak).
-- ============================================================

-- 1) Tambah kolom baru (nullable dulu, supaya bisa diisi bertahap)
ALTER TABLE `laporan_ketidaksesuaian`
  ADD COLUMN `kode_laporan` VARCHAR(20) NULL AFTER `id_laporan`;

-- 2) Isi token acak untuk 2 baris yang sudah ada
UPDATE `laporan_ketidaksesuaian` SET `kode_laporan` = 'LAP-5E822D46' WHERE `id_laporan` = 1;
UPDATE `laporan_ketidaksesuaian` SET `kode_laporan` = 'LAP-68A2E2FC' WHERE `id_laporan` = 2;

-- 3) Kunci kolomnya: wajib diisi + tidak boleh kembar
ALTER TABLE `laporan_ketidaksesuaian`
  MODIFY `kode_laporan` VARCHAR(20) NOT NULL;

ALTER TABLE `laporan_ketidaksesuaian`
  ADD UNIQUE KEY `uq_kode_laporan` (`kode_laporan`);

-- 4) Verifikasi -- harus return 0 baris di dua-duanya
SELECT id_laporan FROM laporan_ketidaksesuaian WHERE kode_laporan IS NULL OR kode_laporan = '';
SELECT kode_laporan, COUNT(*) c FROM laporan_ketidaksesuaian GROUP BY kode_laporan HAVING c > 1;
