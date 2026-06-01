-- Migrasi alur v2 (manual via phpMyAdmin jika perlu)
-- Urutan: VARCHAR dulu → UPDATE → ENUM baru

ALTER TABLE `rancangan_tindakan`
  ADD COLUMN IF NOT EXISTS `aksi_masukan` TEXT NULL COMMENT 'Masukan Ka P4M' AFTER `catatan`;

ALTER TABLE `rancangan_tindakan`
  MODIFY `status_review` VARCHAR(40) NOT NULL DEFAULT 'menunggu_keputusan_ka';

UPDATE `rancangan_tindakan` SET `status_review` = 'menunggu_keputusan_ka'
  WHERE `status_review` IN ('menunggu_review', 'revisi');

UPDATE `rancangan_tindakan` SET `status_review` = 'ditindaklanjuti'
  WHERE `status_review` = 'disetujui';

UPDATE `rancangan_tindakan` SET `status_review` = 'tidak_ditindaklanjuti'
  WHERE `status_review` = 'tidak_disetujui';

ALTER TABLE `rancangan_tindakan`
  MODIFY `status_review` ENUM('menunggu_keputusan_ka','ditindaklanjuti','tidak_ditindaklanjuti')
  NOT NULL DEFAULT 'menunggu_keputusan_ka';

ALTER TABLE `boxing_ketidaksesuaian`
  MODIFY `status` VARCHAR(30) NOT NULL DEFAULT 'terdistribusi';

UPDATE `boxing_ketidaksesuaian` b
JOIN `rancangan_tindakan` r ON r.id_boxing = b.id_boxing
SET b.status = 'menunggu_pelaksanaan'
WHERE r.status_review = 'ditindaklanjuti'
  AND NOT EXISTS (SELECT 1 FROM `pelaksanaan_tindakan` p WHERE p.id_boxing = b.id_boxing);

UPDATE `boxing_ketidaksesuaian` b
JOIN `pelaksanaan_tindakan` p ON p.id_boxing = b.id_boxing
SET b.status = 'di_staff';

UPDATE `boxing_ketidaksesuaian` b
JOIN `rancangan_tindakan` r ON r.id_boxing = b.id_boxing
SET b.status = 'di_staff'
WHERE r.status_review = 'tidak_ditindaklanjuti';

ALTER TABLE `boxing_ketidaksesuaian`
  MODIFY `status` ENUM('terdistribusi','diproses','menunggu_pelaksanaan','di_staff','selesai')
  NOT NULL DEFAULT 'terdistribusi';
