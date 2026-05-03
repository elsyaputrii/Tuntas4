-- FILE: backend/database/add_unit_tujuan.sql
-- Jalankan: mysql -u root -p tuntas4 < database/add_unit_tujuan.sql

USE tuntas4;

-- Tambah kolom unit_tujuan di boxing
ALTER TABLE boxing_ketidaksesuaian
  ADD COLUMN unit_tujuan VARCHAR(100) NULL AFTER id_kepala;

-- id_kepala boleh NULL karena unit tidak harus punya akun
ALTER TABLE boxing_ketidaksesuaian
  MODIFY COLUMN id_kepala INT NULL;