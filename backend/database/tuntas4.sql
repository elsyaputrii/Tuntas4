-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 21, 2026 at 10:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tuntas4`
--

-- --------------------------------------------------------

--
-- Table structure for table `boxing_ketidaksesuaian`
--

CREATE TABLE `boxing_ketidaksesuaian` (
  `id_boxing` int(11) NOT NULL,
  `id_laporan` int(11) NOT NULL COMMENT 'Laporan yang didistribusikan',
  `id_staf` int(11) NOT NULL COMMENT 'Staf P4M yang mendistribusikan',
  `id_kepala` int(11) DEFAULT NULL,
  `unit_tujuan` varchar(100) DEFAULT NULL,
  `id_standar` int(11) DEFAULT NULL COMMENT 'Standar referensi (opsional)',
  `status` enum('terdistribusi','diproses','selesai') NOT NULL DEFAULT 'terdistribusi',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boxing_ketidaksesuaian`
--

INSERT INTO `boxing_ketidaksesuaian` (`id_boxing`, `id_laporan`, `id_staf`, `id_kepala`, `unit_tujuan`, `id_standar`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 'MANAJEMEN', NULL, 'terdistribusi', '2026-05-11 06:08:05', '2026-05-11 06:08:05'),
(2, 2, 1, NULL, 'MANAJEMEN', NULL, 'terdistribusi', '2026-05-12 23:44:12', '2026-05-12 23:44:12'),
(3, 3, 1, NULL, 'MANAJEMEN', NULL, 'terdistribusi', '2026-05-20 17:18:37', '2026-05-20 17:18:37'),
(4, 4, 1, NULL, 'P4M', NULL, 'terdistribusi', '2026-05-21 16:16:17', '2026-05-21 16:16:17'),
(5, 5, 1, NULL, 'MANAJEMEN', NULL, 'terdistribusi', '2026-05-21 18:49:15', '2026-05-21 18:49:15');

-- --------------------------------------------------------

--
-- Table structure for table `civitas_akademika`
--

CREATE TABLE `civitas_akademika` (
  `id_civitas` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL COMMENT 'FK ke tabel pengguna',
  `nama` varchar(100) NOT NULL,
  `status` enum('dosen','mahasiswa','masyarakat') NOT NULL COMMENT 'Status civitas di Polibatam',
  `email` varchar(100) NOT NULL,
  `oid` varchar(30) DEFAULT NULL COMMENT 'NIM jika mahasiswa, NIP jika dosen',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `civitas_akademika`
--

INSERT INTO `civitas_akademika` (`id_civitas`, `id_pengguna`, `nama`, `status`, `email`, `oid`, `created_at`, `updated_at`) VALUES
(1, 4, 'Budi Santoso', 'mahasiswa', 'budi@mhs.polibatam.ac.id', '4311901001', '2026-04-22 20:17:26', '2026-04-22 20:17:26'),
(2, 4, 'Budi Santoso', 'mahasiswa', 'budi@mhs.polibatam.ac.id', '4311901001', '2026-04-22 20:32:27', '2026-04-22 20:32:27');

-- --------------------------------------------------------

--
-- Table structure for table `ekadar_standar_referensi`
--

CREATE TABLE `ekadar_standar_referensi` (
  `id_standar` int(11) NOT NULL,
  `kp_standar` varchar(50) NOT NULL COMMENT 'Kode prosedur, contoh: SOP-001',
  `nilai_standar` text NOT NULL COMMENT 'Isi/deskripsi standar',
  `proses` varchar(100) NOT NULL COMMENT 'Nama proses yang dicakup',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ekadar_standar_referensi`
--

INSERT INTO `ekadar_standar_referensi` (`id_standar`, `kp_standar`, `nilai_standar`, `proses`, `created_at`) VALUES
(1, 'SOP-AKD-001', 'Standar Pelayanan Akademik Polibatam', 'Pelayanan Akademik', '2026-04-22 20:17:26'),
(2, 'SOP-FAK-002', 'Standar Pengelolaan Fasilitas Kampus', 'Pengelolaan Fasilitas', '2026-04-22 20:17:26'),
(3, 'SOP-ADM-003', 'Standar Administrasi dan Tata Kelola', 'Administrasi Umum', '2026-04-22 20:17:26'),
(4, 'SOP-KMH-004', 'Standar Pelayanan Kemahasiswaan', 'Kemahasiswaan', '2026-04-22 20:17:26'),
(5, 'SOP-AKD-001', 'Standar Pelayanan Akademik Polibatam', 'Pelayanan Akademik', '2026-04-22 20:32:27'),
(6, 'SOP-FAK-002', 'Standar Pengelolaan Fasilitas Kampus', 'Pengelolaan Fasilitas', '2026-04-22 20:32:27'),
(7, 'SOP-ADM-003', 'Standar Administrasi dan Tata Kelola', 'Administrasi Umum', '2026-04-22 20:32:27'),
(8, 'SOP-KMH-004', 'Standar Pelayanan Kemahasiswaan', 'Kemahasiswaan', '2026-04-22 20:32:27');

-- --------------------------------------------------------

--
-- Table structure for table `ka_p4m`
--

CREATE TABLE `ka_p4m` (
  `id_ka` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `nip` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ka_p4m`
--

INSERT INTO `ka_p4m` (`id_ka`, `id_pengguna`, `nama`, `nip`, `created_at`, `updated_at`) VALUES
(1, 2, 'Dr. Kepala P4M', '197803152005011002', '2026-04-22 20:17:26', '2026-04-22 20:17:26');

-- --------------------------------------------------------

--
-- Table structure for table `kepala_unit`
--

CREATE TABLE `kepala_unit` (
  `id_kepala` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `nip` varchar(20) NOT NULL,
  `unit` varchar(100) NOT NULL COMMENT 'Nama unit yang dipimpin, contoh: SBAK, SPI',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `kepala_unit`
--

INSERT INTO `kepala_unit` (`id_kepala`, `id_pengguna`, `nama`, `nip`, `unit`, `created_at`, `updated_at`) VALUES
(1, 3, 'Kepala Unit SBAK', '198205201998031003', 'SBAK', '2026-04-22 20:17:26', '2026-04-22 20:17:26');

-- --------------------------------------------------------

--
-- Table structure for table `laporan_ketidaksesuaian`
--

CREATE TABLE `laporan_ketidaksesuaian` (
  `id_laporan` int(11) NOT NULL,
  `id_civitas` int(11) DEFAULT NULL COMMENT 'FK ke civitas jika pakai akun, NULL jika tanpa login',
  `nama_pelapor` varchar(100) NOT NULL DEFAULT 'Anonim',
  `status_pelapor` enum('mahasiswa','dosen','tendik','masyarakat') NOT NULL COMMENT 'Status civitas',
  `jenis_laporan` enum('masukan','kritik','pengaduan') NOT NULL DEFAULT 'pengaduan',
  `deskripsi` text NOT NULL COMMENT 'Isi laporan',
  `lampiran` varchar(255) DEFAULT NULL COMMENT 'Nama file di folder uploads/',
  `status` enum('menunggu','diproses','selesai','ditolak') NOT NULL DEFAULT 'menunggu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `laporan_ketidaksesuaian`
--

INSERT INTO `laporan_ketidaksesuaian` (`id_laporan`, `id_civitas`, `nama_pelapor`, `status_pelapor`, `jenis_laporan`, `deskripsi`, `lampiran`, `status`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Anonim', 'masyarakat', 'masukan', 'ac mati', '1777490660899-ERDnew.drawio.png', 'diproses', '2026-04-29 19:24:20', '2026-05-11 06:08:05'),
(2, NULL, 'Anonim', 'masyarakat', 'masukan', 'inii toilet rusak ', '1777644614951-usecaseneww.drawio.png', 'diproses', '2026-05-01 14:10:14', '2026-05-12 23:44:12'),
(3, NULL, 'Anonim', 'dosen', 'masukan', 'ac rusak', '1777699436529-ERDnew.drawio.png', 'diproses', '2026-05-02 05:23:56', '2026-05-20 17:18:37'),
(4, NULL, 'Anonim', 'dosen', 'masukan', 'kotor gu ', '1779299599842-Screenshot_(229).png', 'diproses', '2026-05-20 17:53:19', '2026-05-21 16:16:17'),
(5, NULL, 'Anonim', 'mahasiswa', 'masukan', 'toilet bau ', '1779388829981-ChatGPT_Image_May_22,_2026,_12_40_10_AM.png', 'diproses', '2026-05-21 18:40:30', '2026-05-21 18:49:15');

-- --------------------------------------------------------

--
-- Table structure for table `laporan_pemantauan`
--

CREATE TABLE `laporan_pemantauan` (
  `id_laporan_amp` int(11) NOT NULL,
  `id_pemantauan` int(11) NOT NULL,
  `id_boxing` int(11) NOT NULL,
  `kisl_tindakan` text NOT NULL COMMENT 'Kesimpulan/hasil tindak lanjut',
  `tanggal` date NOT NULL,
  `kp_laporan` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifikasi`
--

CREATE TABLE `notifikasi` (
  `id_notif` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL COMMENT 'User penerima notifikasi',
  `id_laporan` int(11) DEFAULT NULL COMMENT 'Laporan terkait (opsional)',
  `pesan` text NOT NULL COMMENT 'Isi pesan notifikasi',
  `tanggal` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0 COMMENT '0 = belum dibaca, 1 = sudah dibaca'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Token kadaluwarsa 1 jam',
  `used` tinyint(1) DEFAULT 0 COMMENT '0 = belum dipakai, 1 = sudah dipakai',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pelaksanaan_tindakan`
--

CREATE TABLE `pelaksanaan_tindakan` (
  `id_pelaksanaan` int(11) NOT NULL,
  `id_boxing` int(11) NOT NULL,
  `id_kepala` int(11) NOT NULL,
  `deskripsi` text NOT NULL COMMENT 'Uraian apa yang sudah dilakukan',
  `lampiran` varchar(255) DEFAULT NULL COMMENT 'Bukti foto/dokumen pelaksanaan',
  `tanggal` date NOT NULL COMMENT 'Tanggal pelaksanaan',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pemantauan`
--

CREATE TABLE `pemantauan` (
  `id_pemantauan` int(11) NOT NULL,
  `id_pelaksanaan` int(11) NOT NULL,
  `id_staf` int(11) NOT NULL,
  `hasil` text NOT NULL COMMENT 'Hasil dari pemantauan lapangan',
  `catatan` text DEFAULT NULL,
  `kp_pemantauan` varchar(50) DEFAULT NULL COMMENT 'Kode prosedur pemantauan',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengguna`
--

CREATE TABLE `pengguna` (
  `id_pengguna` int(11) NOT NULL,
  `id_identitas` varchar(30) DEFAULT NULL COMMENT 'NIM/NIP/nomor identitas unik',
  `username` varchar(50) DEFAULT NULL COMMENT 'Username opsional untuk login',
  `nama` varchar(100) NOT NULL COMMENT 'Nama lengkap',
  `email` varchar(100) NOT NULL COMMENT 'Email digunakan untuk login',
  `password` varchar(255) NOT NULL COMMENT 'Password ter-hash bcrypt',
  `role` enum('civitas','staf_p4m','ka_p4m','kepala_unit') NOT NULL COMMENT 'Jabatan/peran di sistem',
  `nip` varchar(20) DEFAULT NULL COMMENT 'NIP (untuk dosen/staff)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pengguna`
--

INSERT INTO `pengguna` (`id_pengguna`, `id_identitas`, `username`, `nama`, `email`, `password`, `role`, `nip`, `created_at`, `updated_at`) VALUES
(1, NULL, NULL, 'Admin Staf P4M', 'staf@polibatam.ac.id', '$2b$10$bb4VGnt.5AA6BbGswGxDTu3Jy.q2lgNaeFzI8k.PCq5qP4xl5iT2e', 'staf_p4m', '198501012010011001', '2026-04-22 20:17:26', '2026-05-02 04:03:39'),
(2, NULL, NULL, 'Dr. Kepala P4M', 'kap4m@polibatam.ac.id', '$2b$10$bb4VGnt.5AA6BbGswGxDTu3Jy.q2lgNaeFzI8k.PCq5qP4xl5iT2e', 'ka_p4m', '197803152005011002', '2026-04-22 20:17:26', '2026-05-02 04:03:39'),
(3, NULL, NULL, 'Kepala Unit SBAK', 'kaunit@polibatam.ac.id', '$2b$10$bb4VGnt.5AA6BbGswGxDTu3Jy.q2lgNaeFzI8k.PCq5qP4xl5iT2e', 'kepala_unit', '198205201998031003', '2026-04-22 20:17:26', '2026-05-02 04:03:39'),
(4, NULL, NULL, 'Budi Santoso', 'budi@mhs.polibatam.ac.id', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKU4fATBDoHbD8Oy', 'civitas', NULL, '2026-04-22 20:17:26', '2026-04-22 20:17:26');

-- --------------------------------------------------------

--
-- Table structure for table `rancangan_tindakan`
--

CREATE TABLE `rancangan_tindakan` (
  `id_rancangan` int(11) NOT NULL,
  `id_boxing` int(11) NOT NULL,
  `penyebab` text NOT NULL COMMENT 'Analisis penyebab masalah',
  `deskripsi` text NOT NULL COMMENT 'Rencana tindak lanjut yang akan dilakukan',
  `status_review` enum('menunggu_review','disetujui','tidak_disetujui','revisi') DEFAULT 'menunggu_review',
  `catatan` text DEFAULT NULL COMMENT 'Catatan tambahan dari Kepala Unit',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `review_tindakan`
--

CREATE TABLE `review_tindakan` (
  `id_review` int(11) NOT NULL,
  `id_rancangan` int(11) NOT NULL,
  `id_ka` int(11) NOT NULL COMMENT 'Ka P4M yang mereview',
  `catatan` text DEFAULT NULL,
  `hasil_review` enum('disetujui','tidak_disetujui') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staf_p4m`
--

CREATE TABLE `staf_p4m` (
  `id_staf` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `nip` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `no_telp` varchar(15) DEFAULT NULL COMMENT 'Nomor telepon (opsional)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staf_p4m`
--

INSERT INTO `staf_p4m` (`id_staf`, `id_pengguna`, `nama`, `nip`, `email`, `no_telp`, `created_at`, `updated_at`) VALUES
(1, 1, 'Admin Staf P4M', '198501012010011001', 'staf@polibatam.ac.id', NULL, '2026-04-22 20:17:26', '2026-04-22 20:17:26');

-- --------------------------------------------------------

--
-- Table structure for table `verifikasi`
--

CREATE TABLE `verifikasi` (
  `id_verifikasi` int(11) NOT NULL,
  `id_laporan_amp` int(11) NOT NULL,
  `id_ka` int(11) NOT NULL,
  `catatan` text DEFAULT NULL,
  `keputusan` enum('diterima','ditolak','revisi') NOT NULL,
  `hasil_akhir` enum('selesai','perlu_tindak_lanjut') NOT NULL,
  `kp_verifikasi` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `boxing_ketidaksesuaian`
--
ALTER TABLE `boxing_ketidaksesuaian`
  ADD PRIMARY KEY (`id_boxing`),
  ADD KEY `id_laporan` (`id_laporan`),
  ADD KEY `id_staf` (`id_staf`),
  ADD KEY `id_kepala` (`id_kepala`),
  ADD KEY `id_standar` (`id_standar`);

--
-- Indexes for table `civitas_akademika`
--
ALTER TABLE `civitas_akademika`
  ADD PRIMARY KEY (`id_civitas`),
  ADD KEY `id_pengguna` (`id_pengguna`);

--
-- Indexes for table `ekadar_standar_referensi`
--
ALTER TABLE `ekadar_standar_referensi`
  ADD PRIMARY KEY (`id_standar`);

--
-- Indexes for table `ka_p4m`
--
ALTER TABLE `ka_p4m`
  ADD PRIMARY KEY (`id_ka`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `id_pengguna` (`id_pengguna`);

--
-- Indexes for table `kepala_unit`
--
ALTER TABLE `kepala_unit`
  ADD PRIMARY KEY (`id_kepala`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `id_pengguna` (`id_pengguna`);

--
-- Indexes for table `laporan_ketidaksesuaian`
--
ALTER TABLE `laporan_ketidaksesuaian`
  ADD PRIMARY KEY (`id_laporan`),
  ADD KEY `id_civitas` (`id_civitas`);

--
-- Indexes for table `laporan_pemantauan`
--
ALTER TABLE `laporan_pemantauan`
  ADD PRIMARY KEY (`id_laporan_amp`),
  ADD KEY `id_pemantauan` (`id_pemantauan`),
  ADD KEY `id_boxing` (`id_boxing`);

--
-- Indexes for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD PRIMARY KEY (`id_notif`),
  ADD KEY `id_pengguna` (`id_pengguna`),
  ADD KEY `id_laporan` (`id_laporan`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `id_pengguna` (`id_pengguna`);

--
-- Indexes for table `pelaksanaan_tindakan`
--
ALTER TABLE `pelaksanaan_tindakan`
  ADD PRIMARY KEY (`id_pelaksanaan`),
  ADD KEY `id_boxing` (`id_boxing`),
  ADD KEY `id_kepala` (`id_kepala`);

--
-- Indexes for table `pemantauan`
--
ALTER TABLE `pemantauan`
  ADD PRIMARY KEY (`id_pemantauan`),
  ADD KEY `id_pelaksanaan` (`id_pelaksanaan`),
  ADD KEY `id_staf` (`id_staf`);

--
-- Indexes for table `pengguna`
--
ALTER TABLE `pengguna`
  ADD PRIMARY KEY (`id_pengguna`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `rancangan_tindakan`
--
ALTER TABLE `rancangan_tindakan`
  ADD PRIMARY KEY (`id_rancangan`),
  ADD KEY `id_boxing` (`id_boxing`);

--
-- Indexes for table `review_tindakan`
--
ALTER TABLE `review_tindakan`
  ADD PRIMARY KEY (`id_review`),
  ADD KEY `id_rancangan` (`id_rancangan`),
  ADD KEY `id_ka` (`id_ka`);

--
-- Indexes for table `staf_p4m`
--
ALTER TABLE `staf_p4m`
  ADD PRIMARY KEY (`id_staf`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `id_pengguna` (`id_pengguna`);

--
-- Indexes for table `verifikasi`
--
ALTER TABLE `verifikasi`
  ADD PRIMARY KEY (`id_verifikasi`),
  ADD KEY `id_laporan_amp` (`id_laporan_amp`),
  ADD KEY `id_ka` (`id_ka`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `boxing_ketidaksesuaian`
--
ALTER TABLE `boxing_ketidaksesuaian`
  MODIFY `id_boxing` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `civitas_akademika`
--
ALTER TABLE `civitas_akademika`
  MODIFY `id_civitas` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ekadar_standar_referensi`
--
ALTER TABLE `ekadar_standar_referensi`
  MODIFY `id_standar` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `ka_p4m`
--
ALTER TABLE `ka_p4m`
  MODIFY `id_ka` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `kepala_unit`
--
ALTER TABLE `kepala_unit`
  MODIFY `id_kepala` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `laporan_ketidaksesuaian`
--
ALTER TABLE `laporan_ketidaksesuaian`
  MODIFY `id_laporan` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `laporan_pemantauan`
--
ALTER TABLE `laporan_pemantauan`
  MODIFY `id_laporan_amp` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifikasi`
--
ALTER TABLE `notifikasi`
  MODIFY `id_notif` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pelaksanaan_tindakan`
--
ALTER TABLE `pelaksanaan_tindakan`
  MODIFY `id_pelaksanaan` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pemantauan`
--
ALTER TABLE `pemantauan`
  MODIFY `id_pemantauan` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pengguna`
--
ALTER TABLE `pengguna`
  MODIFY `id_pengguna` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `rancangan_tindakan`
--
ALTER TABLE `rancangan_tindakan`
  MODIFY `id_rancangan` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `review_tindakan`
--
ALTER TABLE `review_tindakan`
  MODIFY `id_review` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staf_p4m`
--
ALTER TABLE `staf_p4m`
  MODIFY `id_staf` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `verifikasi`
--
ALTER TABLE `verifikasi`
  MODIFY `id_verifikasi` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `boxing_ketidaksesuaian`
--
ALTER TABLE `boxing_ketidaksesuaian`
  ADD CONSTRAINT `boxing_ketidaksesuaian_ibfk_1` FOREIGN KEY (`id_laporan`) REFERENCES `laporan_ketidaksesuaian` (`id_laporan`) ON DELETE CASCADE,
  ADD CONSTRAINT `boxing_ketidaksesuaian_ibfk_2` FOREIGN KEY (`id_staf`) REFERENCES `staf_p4m` (`id_staf`),
  ADD CONSTRAINT `boxing_ketidaksesuaian_ibfk_3` FOREIGN KEY (`id_kepala`) REFERENCES `kepala_unit` (`id_kepala`),
  ADD CONSTRAINT `boxing_ketidaksesuaian_ibfk_4` FOREIGN KEY (`id_standar`) REFERENCES `ekadar_standar_referensi` (`id_standar`) ON DELETE SET NULL;

--
-- Constraints for table `civitas_akademika`
--
ALTER TABLE `civitas_akademika`
  ADD CONSTRAINT `civitas_akademika_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `ka_p4m`
--
ALTER TABLE `ka_p4m`
  ADD CONSTRAINT `ka_p4m_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `kepala_unit`
--
ALTER TABLE `kepala_unit`
  ADD CONSTRAINT `kepala_unit_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `laporan_ketidaksesuaian`
--
ALTER TABLE `laporan_ketidaksesuaian`
  ADD CONSTRAINT `laporan_ketidaksesuaian_ibfk_1` FOREIGN KEY (`id_civitas`) REFERENCES `civitas_akademika` (`id_civitas`) ON DELETE SET NULL;

--
-- Constraints for table `laporan_pemantauan`
--
ALTER TABLE `laporan_pemantauan`
  ADD CONSTRAINT `laporan_pemantauan_ibfk_1` FOREIGN KEY (`id_pemantauan`) REFERENCES `pemantauan` (`id_pemantauan`) ON DELETE CASCADE,
  ADD CONSTRAINT `laporan_pemantauan_ibfk_2` FOREIGN KEY (`id_boxing`) REFERENCES `boxing_ketidaksesuaian` (`id_boxing`);

--
-- Constraints for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD CONSTRAINT `notifikasi_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifikasi_ibfk_2` FOREIGN KEY (`id_laporan`) REFERENCES `laporan_ketidaksesuaian` (`id_laporan`) ON DELETE SET NULL;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `pelaksanaan_tindakan`
--
ALTER TABLE `pelaksanaan_tindakan`
  ADD CONSTRAINT `pelaksanaan_tindakan_ibfk_1` FOREIGN KEY (`id_boxing`) REFERENCES `boxing_ketidaksesuaian` (`id_boxing`) ON DELETE CASCADE,
  ADD CONSTRAINT `pelaksanaan_tindakan_ibfk_2` FOREIGN KEY (`id_kepala`) REFERENCES `kepala_unit` (`id_kepala`);

--
-- Constraints for table `pemantauan`
--
ALTER TABLE `pemantauan`
  ADD CONSTRAINT `pemantauan_ibfk_1` FOREIGN KEY (`id_pelaksanaan`) REFERENCES `pelaksanaan_tindakan` (`id_pelaksanaan`) ON DELETE CASCADE,
  ADD CONSTRAINT `pemantauan_ibfk_2` FOREIGN KEY (`id_staf`) REFERENCES `staf_p4m` (`id_staf`);

--
-- Constraints for table `rancangan_tindakan`
--
ALTER TABLE `rancangan_tindakan`
  ADD CONSTRAINT `rancangan_tindakan_ibfk_1` FOREIGN KEY (`id_boxing`) REFERENCES `boxing_ketidaksesuaian` (`id_boxing`) ON DELETE CASCADE;

--
-- Constraints for table `review_tindakan`
--
ALTER TABLE `review_tindakan`
  ADD CONSTRAINT `review_tindakan_ibfk_1` FOREIGN KEY (`id_rancangan`) REFERENCES `rancangan_tindakan` (`id_rancangan`) ON DELETE CASCADE,
  ADD CONSTRAINT `review_tindakan_ibfk_2` FOREIGN KEY (`id_ka`) REFERENCES `ka_p4m` (`id_ka`);

--
-- Constraints for table `staf_p4m`
--
ALTER TABLE `staf_p4m`
  ADD CONSTRAINT `staf_p4m_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `verifikasi`
--
ALTER TABLE `verifikasi`
  ADD CONSTRAINT `verifikasi_ibfk_1` FOREIGN KEY (`id_laporan_amp`) REFERENCES `laporan_pemantauan` (`id_laporan_amp`) ON DELETE CASCADE,
  ADD CONSTRAINT `verifikasi_ibfk_2` FOREIGN KEY (`id_ka`) REFERENCES `ka_p4m` (`id_ka`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
