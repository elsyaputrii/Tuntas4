-- Jalankan query ini di database tuntas4
-- Tambahkan tabel untuk menyimpan token reset password

USE tuntas4;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  id_pengguna  INT          NOT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,
  expires_at   TIMESTAMP    NOT NULL            COMMENT 'Token kadaluwarsa 1 jam',
  used         TINYINT(1)   DEFAULT 0           COMMENT '0 = belum dipakai, 1 = sudah dipakai',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);