# TUNTAS4 — Paket Perbaikan Pre-Deploy

Struktur folder di ZIP ini SAMA PERSIS dengan struktur project asli —
tinggal extract lalu timpa (overwrite) file yang sama namanya di project kamu.

## URUTAN PEMASANGAN (WAJIB IKUT URUTAN INI)

### 1. Backend — copy semua file di folder `backend/`
Termasuk 4 file BARU:
- backend/middleware/rateLimitMiddleware.js
- backend/utils/kodeLaporan.js
- backend/scripts/migrateKodeLaporan.js
- backend/database/add_kode_laporan_acak.sql

### 2. Install ulang dependency backend
```
cd backend
rm -rf node_modules package-lock.json
npm install
```
(WAJIB rm -rf dulu — ada major version bump di multer & nodemailer)

### 3. Migrasi database — PILIH SALAH SATU:

**Opsi A (kalau data laporan masih 2 baris, sama seperti dump yang kamu kasih):**
Jalankan `backend/database/add_kode_laporan_acak.sql` langsung di
phpMyAdmin / mysql client. Sudah siap pakai (token acak sudah digenerate).

Sebelum jalankan, cek dulu jumlah baris masih 2 atau tidak:
```sql
SELECT COUNT(*) FROM laporan_ketidaksesuaian;
```

**Opsi B (kalau datanya sudah nambah / mau lebih aman):**
```
cd backend
npm run migrate:kode-laporan
```
Script ini otomatis isi kode_laporan acak untuk BERAPA PUN jumlah baris
yang ada, jadi lebih aman dipakai kapan saja.

⚠️ Jangan jalankan KEDUANYA — pilih salah satu saja.

### 4. Frontend — copy semua file di folder `frontend/`

### 5. Install ulang dependency frontend
```
cd frontend
npm install
```
(next di-bump ke 16.3.4, tidak perlu rm -rf node_modules dulu — minor bump)

### 6. Restart backend & frontend, lalu test pakai checklist yang saya
kasih di pesan chat (rate limit, kode tiket acak, role-auth endpoint,
ESLint, dst).

## Daftar Perubahan Per File

| File | Perubahan |
|---|---|
| backend/routes/civitasRoutes.js | GET /laporan wajib auth+role staf_p4m; POST /laporan pakai rate limiter |
| backend/controllers/civitasController.js | kode_laporan acak (bukan sequential); hapus jalur cek status via ?id= |
| backend/controllers/kepalaUnitController.js | pakai kolom l.kode_laporan asli |
| backend/controllers/stafController.js | pakai kolom l.kode_laporan asli |
| backend/routes/kaP4MRoutes.js | pakai kolom l.kode_laporan asli |
| backend/server.js | trust proxy untuk Nginx |
| backend/middleware/rateLimitMiddleware.js | BARU — rate limit 5/10menit/IP |
| backend/utils/kodeLaporan.js | BARU — generator token acak |
| backend/scripts/migrateKodeLaporan.js | BARU — migrasi otomatis semua baris |
| backend/database/add_kode_laporan_acak.sql | BARU — migrasi manual siap-jalan untuk 2 baris data saat ini |
| backend/package.json | +express-rate-limit, nodemailer 8→9.1.1, multer 1→2.3.0, express 4.19→4.22.1, qs override |
| frontend/package.json | next 16.2.2→16.3.4 |
| frontend/app/(dashboard)/ka-p4m/hasil-tindak-lanjut/page.tsx | fix ESLint set-state-in-effect |
| frontend/app/(dashboard)/ka-p4m/proses-pengaduan/page.tsx | fix ESLint set-state-in-effect |
| frontend/app/(dashboard)/kepala-unit/laporan-hasil/page.tsx | fix ESLint set-state-in-effect |
| frontend/app/(dashboard)/kepala-unit/riwayat/page.tsx | fix ESLint set-state-in-effect |
| frontend/app/(dashboard)/staff-p4m/page.tsx | fix exhaustive-deps (useCallback fetchData) |
| frontend/components/auth/StafLoginForm.tsx | hapus handleLupaPassword (dead code, unused) |
| frontend/components/forms/SubmissionForm.tsx | hapus kategori & currentMonthStart (unused) |
| frontend/components/ka-p4m/KaP4MHasilTable.tsx | fix unescaped quotes |
| frontend/components/kepala-unit/StafDecisionTable.tsx | hapus tanggal & uraian state (unused) |
| frontend/components/kepala-unit/DiscrepancyTable.tsx | fix Masalah A (isEditable vocabulary lama→baru) — dari sesi sebelumnya |
| frontend/components/staff-p4m/tables/RecapitulationTable.tsx | loadingArsip dipakai buat indikator loading |

## Yang TIDAK ada di paket ini (perlu kamu kerjakan manual)

1. **Purge `backend/.env` dari git history** (pernah ke-commit di masa lalu).
   Command (jalankan hati-hati, backup dulu, koordinasi tim kalau repo dipakai bareng):
   ```
   pip install git-filter-repo   # atau: brew install git-filter-repo
   git filter-repo --path backend/.env --invert-paths
   git push origin --force --all
   ```
2. **Rotate JWT_SECRET** di server produksi (nilai lama yang sempat
   bocor: `our_super_secret_jwt_key_here_change_in_production` — kalau
   ini yang masih dipakai di produksi, WAJIB ganti sekarang juga,
   nilai itu bukan secret, itu placeholder default yang tidak aman).
3. **Cek Nginx config** — pastikan ada:
   ```
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Real-IP $remote_addr;
   ```
   Tanpa ini, `trust proxy` di server.js tidak berguna dan rate limit salah sasaran.
