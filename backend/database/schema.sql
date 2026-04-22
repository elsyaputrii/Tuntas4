-- ================================================================
-- FILE: database/schema.sql
-- Tujuan: Membuat semua tabel database TUNTAS dari awal (fresh)
-- Cara pakai: mysql -u root -p < database/schema.sql
-- ================================================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS tuntas4
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Gunakan database ini
USE tuntas4;

-- ================================================================
-- TABEL 1: pengguna
-- Menyimpan semua akun user dari semua role/jabatan
-- ================================================================
CREATE TABLE IF NOT EXISTS pengguna (
  id_pengguna   INT           AUTO_INCREMENT PRIMARY KEY,
  id_identitas  VARCHAR(30)   NULL        COMMENT 'NIM/NIP/nomor identitas unik',
  username      VARCHAR(50)   NULL UNIQUE COMMENT 'Username opsional untuk login',
  nama          VARCHAR(100)  NOT NULL    COMMENT 'Nama lengkap',
  email         VARCHAR(100)  NOT NULL UNIQUE COMMENT 'Email digunakan untuk login',
  password      VARCHAR(255)  NOT NULL    COMMENT 'Password ter-hash bcrypt',
  role          ENUM(
                  'civitas',
                  'staf_p4m',
                  'ka_p4m',
                  'kepala_unit'
                )             NOT NULL    COMMENT 'Jabatan/peran di sistem',
  nip           VARCHAR(20)   NULL        COMMENT 'NIP (untuk dosen/staff)',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ================================================================
-- TABEL 2: civitas_akademika
-- Detail profil untuk user dengan role = 'civitas'
-- Terhubung ke tabel pengguna (1-to-1)
-- ================================================================
CREATE TABLE IF NOT EXISTS civitas_akademika (
  id_civitas  INT           AUTO_INCREMENT PRIMARY KEY,
  id_pengguna INT           NOT NULL    COMMENT 'FK ke tabel pengguna',
  nama        VARCHAR(100)  NOT NULL,
  status      ENUM(
                'dosen',
                'mahasiswa',
                'masyarakat'
              )             NOT NULL    COMMENT 'Status civitas di Polibatam',
  email       VARCHAR(100)  NOT NULL,
  oid         VARCHAR(30)   NULL        COMMENT 'NIM jika mahasiswa, NIP jika dosen',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Relasi: hapus civitas jika pengguna dihapus
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 3: staf_p4m
-- Detail profil untuk user dengan role = 'staf_p4m'
-- ================================================================
CREATE TABLE IF NOT EXISTS staf_p4m (
  id_staf     INT           AUTO_INCREMENT PRIMARY KEY,
  id_pengguna INT           NOT NULL,
  nama        VARCHAR(100)  NOT NULL,
  nip         VARCHAR(20)   NOT NULL UNIQUE,
  email       VARCHAR(100)  NOT NULL,
  no_telp     VARCHAR(15)   NULL     COMMENT 'Nomor telepon (opsional)',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 4: ka_p4m
-- Detail profil untuk Kepala P4M (role = 'ka_p4m')
-- ================================================================
CREATE TABLE IF NOT EXISTS ka_p4m (
  id_ka       INT           AUTO_INCREMENT PRIMARY KEY,
  id_pengguna INT           NOT NULL,
  nama        VARCHAR(100)  NOT NULL,
  nip         VARCHAR(20)   NOT NULL UNIQUE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 5: kepala_unit
-- Detail profil untuk Kepala Unit (role = 'kepala_unit')
-- ================================================================
CREATE TABLE IF NOT EXISTS kepala_unit (
  id_kepala   INT           AUTO_INCREMENT PRIMARY KEY,
  id_pengguna INT           NOT NULL,
  nama        VARCHAR(100)  NOT NULL,
  nip         VARCHAR(20)   NOT NULL UNIQUE,
  unit        VARCHAR(100)  NOT NULL COMMENT 'Nama unit yang dipimpin, contoh: SBAK, SPI',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 6: ekadar_standar_referensi
-- Standar/prosedur referensi yang digunakan P4M
-- ================================================================
CREATE TABLE IF NOT EXISTS ekadar_standar_referensi (
  id_standar    INT           AUTO_INCREMENT PRIMARY KEY,
  kp_standar    VARCHAR(50)   NOT NULL COMMENT 'Kode prosedur, contoh: SOP-001',
  nilai_standar TEXT          NOT NULL COMMENT 'Isi/deskripsi standar',
  proses        VARCHAR(100)  NOT NULL COMMENT 'Nama proses yang dicakup',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- TABEL 7: laporan_ketidaksesuaian
-- Laporan yang dikirim oleh Civitas Akademika
-- Ini adalah tabel UTAMA yang jadi inti alur kerja
-- ================================================================
CREATE TABLE IF NOT EXISTS laporan_ketidaksesuaian (
  id_laporan    INT           AUTO_INCREMENT PRIMARY KEY,
  id_civitas    INT           NOT NULL    COMMENT 'Siapa yang melapor',
  jenis_laporan ENUM(
                  'masukan',
                  'kritik',
                  'pengaduan',
                  'saran'
                )             NOT NULL DEFAULT 'pengaduan',
  deskripsi     TEXT          NOT NULL COMMENT 'Isi laporan',
  lampiran      VARCHAR(255)  NULL     COMMENT 'Nama file lampiran yang disimpan di folder uploads/',
  status        ENUM(
                  'menunggu',   -- baru dikirim, belum diproses
                  'diproses',   -- sedang ditangani
                  'selesai',    -- sudah tuntas
                  'ditolak'     -- ditolak oleh P4M
                )             NOT NULL DEFAULT 'menunggu',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_civitas) REFERENCES civitas_akademika(id_civitas) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 8: boxing_ketidaksesuaian
-- Proses distribusi/penugasan laporan ke Kepala Unit oleh Staf P4M
-- ================================================================
CREATE TABLE IF NOT EXISTS boxing_ketidaksesuaian (
  id_boxing   INT         AUTO_INCREMENT PRIMARY KEY,
  id_laporan  INT         NOT NULL COMMENT 'Laporan yang didistribusikan',
  id_staf     INT         NOT NULL COMMENT 'Staf P4M yang mendistribusikan',
  id_kepala   INT         NOT NULL COMMENT 'Kepala Unit yang ditugaskan',
  id_standar  INT         NULL     COMMENT 'Standar referensi (opsional)',
  status      ENUM(
                'terdistribusi',
                'diproses',
                'selesai'
              )           NOT NULL DEFAULT 'terdistribusi',
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_laporan) REFERENCES laporan_ketidaksesuaian(id_laporan) ON DELETE CASCADE,
  FOREIGN KEY (id_staf)    REFERENCES staf_p4m(id_staf),
  FOREIGN KEY (id_kepala)  REFERENCES kepala_unit(id_kepala),
  FOREIGN KEY (id_standar) REFERENCES ekadar_standar_referensi(id_standar) ON DELETE SET NULL
);

-- ================================================================
-- TABEL 9: rancangan_tindakan
-- Rencana tindak lanjut yang dibuat oleh Kepala Unit
-- ================================================================
CREATE TABLE IF NOT EXISTS rancangan_tindakan (
  id_rancangan  INT         AUTO_INCREMENT PRIMARY KEY,
  id_boxing     INT         NOT NULL,
  penyebab      TEXT        NOT NULL COMMENT 'Analisis penyebab masalah',
  deskripsi     TEXT        NOT NULL COMMENT 'Rencana tindak lanjut yang akan dilakukan',
  status_review ENUM(
                  'menunggu_review',
                  'disetujui',
                  'tidak_disetujui',
                  'revisi'
                )           DEFAULT 'menunggu_review',
  catatan       TEXT        NULL COMMENT 'Catatan tambahan dari Kepala Unit',
  created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_boxing) REFERENCES boxing_ketidaksesuaian(id_boxing) ON DELETE CASCADE
);

-- ================================================================
-- TABEL 10: review_tindakan
-- Review/persetujuan rancangan oleh Ka P4M
-- ================================================================
CREATE TABLE IF NOT EXISTS review_tindakan (
  id_review     INT         AUTO_INCREMENT PRIMARY KEY,
  id_rancangan  INT         NOT NULL,
  id_ka         INT         NOT NULL COMMENT 'Ka P4M yang mereview',
  catatan       TEXT        NULL,
  hasil_review  ENUM(
                  'disetujui',
                  'tidak_disetujui'
                )           NOT NULL,
  created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_rancangan) REFERENCES rancangan_tindakan(id_rancangan) ON DELETE CASCADE,
  FOREIGN KEY (id_ka)        REFERENCES ka_p4m(id_ka)
);

-- ================================================================
-- TABEL 11: pelaksanaan_tindakan
-- Hasil nyata pelaksanaan tindakan oleh Kepala Unit
-- ================================================================
CREATE TABLE IF NOT EXISTS pelaksanaan_tindakan (
  id_pelaksanaan  INT           AUTO_INCREMENT PRIMARY KEY,
  id_boxing       INT           NOT NULL,
  id_kepala       INT           NOT NULL,
  deskripsi       TEXT          NOT NULL COMMENT 'Uraian apa yang sudah dilakukan',
  lampiran        VARCHAR(255)  NULL     COMMENT 'Bukti foto/dokumen pelaksanaan',
  tanggal         DATE          NOT NULL COMMENT 'Tanggal pelaksanaan',
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_boxing)  REFERENCES boxing_ketidaksesuaian(id_boxing) ON DELETE CASCADE,
  FOREIGN KEY (id_kepala)  REFERENCES kepala_unit(id_kepala)
);

-- ================================================================
-- TABEL 12: pemantauan
-- Pemantauan progres pelaksanaan oleh Staf P4M
-- ================================================================
CREATE TABLE IF NOT EXISTS pemantauan (
  id_pemantauan   INT           AUTO_INCREMENT PRIMARY KEY,
  id_pelaksanaan  INT           NOT NULL,
  id_staf         INT           NOT NULL,
  hasil           TEXT          NOT NULL COMMENT 'Hasil dari pemantauan lapangan',
  catatan         TEXT          NULL,
  kp_pemantauan   VARCHAR(50)   NULL     COMMENT 'Kode prosedur pemantauan',
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pelaksanaan) REFERENCES pelaksanaan_tindakan(id_pelaksanaan) ON DELETE CASCADE,
  FOREIGN KEY (id_staf)        REFERENCES staf_p4m(id_staf)
);

-- ================================================================
-- TABEL 13: laporan_pemantauan
-- Laporan resmi hasil pemantauan yang dibuat Staf P4M
-- ================================================================
CREATE TABLE IF NOT EXISTS laporan_pemantauan (
  id_laporan_amp  INT           AUTO_INCREMENT PRIMARY KEY,
  id_pemantauan   INT           NOT NULL,
  id_boxing       INT           NOT NULL,
  kisl_tindakan   TEXT          NOT NULL COMMENT 'Kesimpulan/hasil tindak lanjut',
  tanggal         DATE          NOT NULL,
  kp_laporan      VARCHAR(50)   NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pemantauan) REFERENCES pemantauan(id_pemantauan) ON DELETE CASCADE,
  FOREIGN KEY (id_boxing)     REFERENCES boxing_ketidaksesuaian(id_boxing)
);

-- ================================================================
-- TABEL 14: verifikasi
-- Verifikasi akhir oleh Ka P4M sebelum laporan dinyatakan selesai
-- ================================================================
CREATE TABLE IF NOT EXISTS verifikasi (
  id_verifikasi   INT           AUTO_INCREMENT PRIMARY KEY,
  id_laporan_amp  INT           NOT NULL,
  id_ka           INT           NOT NULL,
  catatan         TEXT          NULL,
  keputusan       ENUM(
                    'diterima',
                    'ditolak',
                    'revisi'
                  )             NOT NULL,
  hasil_akhir     ENUM(
                    'selesai',
                    'perlu_tindak_lanjut'
                  )             NOT NULL,
  kp_verifikasi   VARCHAR(50)   NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_laporan_amp) REFERENCES laporan_pemantauan(id_laporan_amp) ON DELETE CASCADE,
  FOREIGN KEY (id_ka)          REFERENCES ka_p4m(id_ka)
);

-- ================================================================
-- TABEL 15: notifikasi
-- Notifikasi sistem untuk semua user
-- ================================================================
CREATE TABLE IF NOT EXISTS notifikasi (
  id_notif    INT           AUTO_INCREMENT PRIMARY KEY,
  id_pengguna INT           NOT NULL COMMENT 'User penerima notifikasi',
  id_laporan  INT           NULL     COMMENT 'Laporan terkait (opsional)',
  pesan       TEXT          NOT NULL COMMENT 'Isi pesan notifikasi',
  tanggal     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  is_read     TINYINT(1)    DEFAULT 0 COMMENT '0 = belum dibaca, 1 = sudah dibaca',
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE,
  FOREIGN KEY (id_laporan)  REFERENCES laporan_ketidaksesuaian(id_laporan) ON DELETE SET NULL
);

-- ================================================================
-- DATA AWAL (SEED) — untuk keperluan testing
-- Default password semua akun: Password123!
-- Hash bcrypt dari: Password123!
-- ================================================================

INSERT INTO pengguna (nama, email, password, role, nip) VALUES
  -- Staf P4M
  ('Admin Staf P4M', 'staf@polibatam.ac.id',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKU4fATBDoHbD8Oy',
   'staf_p4m', '198501012010011001'),

  -- Ka P4M
  ('Dr. Kepala P4M', 'kap4m@polibatam.ac.id',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKU4fATBDoHbD8Oy',
   'ka_p4m', '197803152005011002'),

  -- Kepala Unit
  ('Kepala Unit SBAK', 'kaunit@polibatam.ac.id',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKU4fATBDoHbD8Oy',
   'kepala_unit', '198205201998031003'),

  -- Civitas (Mahasiswa)
  ('Budi Santoso', 'budi@mhs.polibatam.ac.id',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKU4fATBDoHbD8Oy',
   'civitas', NULL);

-- Profil Staf P4M
INSERT INTO staf_p4m (id_pengguna, nama, nip, email)
  VALUES (1, 'Admin Staf P4M', '198501012010011001', 'staf@polibatam.ac.id');

-- Profil Ka P4M
INSERT INTO ka_p4m (id_pengguna, nama, nip)
  VALUES (2, 'Dr. Kepala P4M', '197803152005011002');

-- Profil Kepala Unit
INSERT INTO kepala_unit (id_pengguna, nama, nip, unit)
  VALUES (3, 'Kepala Unit SBAK', '198205201998031003', 'SBAK');

-- Profil Civitas (Mahasiswa)
INSERT INTO civitas_akademika (id_pengguna, nama, status, email, oid)
  VALUES (4, 'Budi Santoso', 'mahasiswa', 'budi@mhs.polibatam.ac.id', '4311901001');

-- Data Standar Referensi
INSERT INTO ekadar_standar_referensi (kp_standar, nilai_standar, proses) VALUES
  ('SOP-AKD-001', 'Standar Pelayanan Akademik Polibatam', 'Pelayanan Akademik'),
  ('SOP-FAK-002', 'Standar Pengelolaan Fasilitas Kampus',  'Pengelolaan Fasilitas'),
  ('SOP-ADM-003', 'Standar Administrasi dan Tata Kelola', 'Administrasi Umum'),
  ('SOP-KMH-004', 'Standar Pelayanan Kemahasiswaan',      'Kemahasiswaan');