"""
locustfile.py — Load test untuk backend Tuntas4 (Express + MySQL)
Jalankan:
    locust -f locustfile.py --host=http://localhost:5000

Sebelum jalan, isi kredensial test di bawah (env var atau langsung
edit konstanta), pastikan akun2 tsb sudah ada di database (tabel
`pengguna`) dengan role masing-masing: staf_p4m, ka_p4m, kepala_unit.
"""

import os
import random
from locust import HttpUser, task, between, tag

# ── Kredensial akun test (ganti sesuai data seed kamu) ─────────────
STAF_EMAIL         = os.getenv("STAF_EMAIL", "staf@polibatam.ac.id")
STAF_PASSWORD      = os.getenv("STAF_PASSWORD", "jembatanbarelang1")

KAP4M_EMAIL        = os.getenv("KAP4M_EMAIL", "kap4m@polibatam.ac.id")
KAP4M_PASSWORD     = os.getenv("KAP4M_PASSWORD", "Password123!")

KEPALA_UNIT_EMAIL    = os.getenv("KEPALA_UNIT_EMAIL", "kaunit.manajemen@polibatam.ac.id")
KEPALA_UNIT_PASSWORD = os.getenv("KEPALA_UNIT_PASSWORD", "password123")

# ── Pool akun Kepala Unit ───────────────────────────────────────────
# Karena role kepala_unit itu 1 akun = 1 unit (id_kepala beda-beda),
# supaya load test lebih realistis tiap "virtual user" login pakai
# akun unit yang berbeda-beda (dipilih acak dari pool ini).
#
# Cara isi via environment variable (format: "email1:pass1,email2:pass2,..."):
#   export KEPALA_UNIT_ACCOUNTS="unit1@kampus.ac.id:pass123,unit2@kampus.ac.id:pass123"
#
# Kalau env var kosong, fallback pakai KEPALA_UNIT_EMAIL/PASSWORD tunggal di atas.
def _parse_accounts(env_value, fallback_email, fallback_password):
    if not env_value:
        return [(fallback_email, fallback_password)]
    accounts = []
    for pair in env_value.split(","):
        pair = pair.strip()
        if not pair:
            continue
        email, _, password = pair.partition(":")
        if email and password:
            accounts.append((email.strip(), password.strip()))
    return accounts or [(fallback_email, fallback_password)]


KEPALA_UNIT_ACCOUNTS = _parse_accounts(
    os.getenv("KEPALA_UNIT_ACCOUNTS"), KEPALA_UNIT_EMAIL, KEPALA_UNIT_PASSWORD
)


def login(client, path, email, password):
    """Helper login, balikin token JWT (atau None kalau gagal)."""
    with client.post(
        path,
        json={"email": email, "password": password},
        name=f"POST {path}",
        catch_response=True,
    ) as resp:
        try:
            data = resp.json()
        except ValueError:
            resp.failure("Response bukan JSON")
            return None

        if resp.status_code == 200 and data.get("success"):
            resp.success()
            return data.get("token") or data.get("data", {}).get("token")

        resp.failure(f"Login gagal: {resp.status_code} - {data.get('message')}")
        return None


# ============================================================
# 1) USER PUBLIK — Civitas (tanpa login, kirim & cek laporan)
# ============================================================
class CivitasUser(HttpUser):
    """Simulasi civitas akademik yang mengirim & mengecek laporan ketidaksesuaian."""

    weight = 3
    wait_time = between(1, 3)

    @task(2)
    @tag("civitas")
    def kirim_laporan(self):
        payload = {
            "status_pelapor": random.choice(
                ["mahasiswa", "dosen", "tendik", "masyarakat"]
            ),
            "jenis_laporan": random.choice(["masukan", "kritik", "pengaduan"]),
            "deskripsi": "Laporan otomatis dari pengujian Locust untuk simulasi beban.",
        }
        with self.client.post(
            "/api/civitas/laporan",
            data=payload,
            name="POST /api/civitas/laporan",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                resp.failure(f"Gagal kirim laporan: {resp.status_code} - {resp.text}")

    @task(3)
    @tag("civitas")
    def cek_status_laporan(self):
        # Kode contoh, sesuaikan rentang ini dengan id_laporan yang benar2
        # ada di DB kamu supaya makin representatif.
        kode = f"LAP-{random.randint(1, 50):05d}"
        with self.client.get(
            f"/api/civitas/laporan/cek?kode={kode}",
            name="GET /api/civitas/laporan/cek",
            catch_response=True,
        ) as resp:
            # 404 = kode tidak ditemukan, ini respons valid dari backend,
            # bukan error server. Hanya 5xx yang dianggap gagal beneran.
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Status tak terduga: {resp.status_code}")

    @task(1)
    @tag("civitas")
    def riwayat_laporan(self):
        self.client.get("/api/civitas/laporan", name="GET /api/civitas/laporan")

    @task(1)
    @tag("civitas")
    def health_check(self):
        self.client.get("/", name="GET /")


# ============================================================
# 2) USER STAF P4M — login lalu akses tab laporan/proses/rekap
# ============================================================
class StafUser(HttpUser):
    weight = 2
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        self.token = login(
            self.client, "/api/auth/staf/login", STAF_EMAIL, STAF_PASSWORD
        )

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    @tag("staf")
    def get_laporan_masuk(self):
        if self.token:
            self.client.get(
                "/api/staf/laporan", headers=self.headers, name="GET /api/staf/laporan"
            )

    @task(2)
    @tag("staf")
    def get_proses_monitor(self):
        if self.token:
            self.client.get(
                "/api/staf/proses", headers=self.headers, name="GET /api/staf/proses"
            )

    @task(1)
    @tag("staf")
    def get_rekapitulasi(self):
        if self.token:
            self.client.get(
                "/api/staf/rekap", headers=self.headers, name="GET /api/staf/rekap"
            )

    @task(1)
    @tag("staf")
    def get_me(self):
        if self.token:
            self.client.get(
                "/api/auth/me", headers=self.headers, name="GET /api/auth/me"
            )


# ============================================================
# 3) USER KEPALA UNIT / KA P4M — login lalu akses tab masing2
# ============================================================
class KepalaUnitUser(HttpUser):
    weight = 2
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        email, password = random.choice(KEPALA_UNIT_ACCOUNTS)
        self.token = login(
            self.client, "/api/auth/kepala-unit/login", email, password
        )

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    @tag("kepala_unit")
    def get_laporan_masuk(self):
        if self.token:
            self.client.get(
                "/api/kepala-unit/laporan",
                headers=self.headers,
                name="GET /api/kepala-unit/laporan",
            )

    @task(2)
    @tag("kepala_unit")
    def get_laporan_hasil(self):
        if self.token:
            self.client.get(
                "/api/kepala-unit/laporan-hasil",
                headers=self.headers,
                name="GET /api/kepala-unit/laporan-hasil",
            )

    @task(1)
    @tag("kepala_unit")
    def get_riwayat(self):
        if self.token:
            self.client.get(
                "/api/kepala-unit/riwayat",
                headers=self.headers,
                name="GET /api/kepala-unit/riwayat",
            )


class KaP4MUser(HttpUser):
    weight = 1
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        self.token = login(
            self.client, "/api/auth/kap4m/login", KAP4M_EMAIL, KAP4M_PASSWORD
        )

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(2)
    @tag("ka_p4m")
    def get_proses(self):
        if self.token:
            self.client.get(
                "/api/ka-p4m/proses", headers=self.headers, name="GET /api/ka-p4m/proses"
            )

    @task(1)
    @tag("ka_p4m")
    def get_kepala_unit_laporan_masuk(self):
        if self.token:
            self.client.get(
                "/api/ka-p4m/kepala-unit/laporan-masuk",
                headers=self.headers,
                name="GET /api/ka-p4m/kepala-unit/laporan-masuk",
            )