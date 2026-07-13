-- FILE: backend/database/add_tanda_tangan.sql
-- Tujuan: Menambahkan kolom tanda_tangan (gambar TTD digital, seperti di
--         dokumen resmi bank) ke tabel pengguna. Dipakai oleh Staf P4M,
--         Ka P4M, dan Kepala Unit untuk menandatangani dokumen PDF yang
--         digenerate sistem (contoh: PDF Rekapitulasi di halaman Staf P4M).
-- Jalankan: mysql -u root -p tuntas4 < database/add_tanda_tangan.sql

USE tuntas4;

ALTER TABLE pengguna
  ADD COLUMN tanda_tangan VARCHAR(255) NULL
  COMMENT 'Nama file gambar tanda tangan (disimpan di folder uploads/)'
  AFTER nip;