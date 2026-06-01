// FILE: frontend/lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data     = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Terjadi kesalahan pada server");
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// CIVITAS (tanpa login — laporan anonim)
// ─────────────────────────────────────────────────────────────────────────────
export const civitasApi = {
  kirimLaporan: (formData: FormData) =>
    apiFetch("/civitas/laporan", { method: "POST", body: formData }),
  cekStatus: (kode: string) =>
    apiFetch(`/civitas/laporan/cek?kode=${encodeURIComponent(kode)}`),
  getRiwayat: (nama?: string) =>
    apiFetch(`/civitas/laporan${nama ? `?nama=${encodeURIComponent(nama)}` : ""}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — login, forgot password, reset password
// Dipakai oleh semua role: staf_p4m, ka_p4m, kepala_unit
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  loginStaf: (email: string, password: string) =>
    apiFetch("/auth/staf/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  loginKaP4M: (email: string, password: string) =>
    apiFetch("/auth/kap4m/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  loginKepalaUnit: (email: string, password: string) =>
    apiFetch("/auth/kepala-unit/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiFetch("/auth/me"),
  forgotPassword: (email: string, role: string) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// STAF P4M — semua endpoint butuh token role = staf_p4m
// ─────────────────────────────────────────────────────────────────────────────
export const stafApi = {
  // Lihat laporan masuk yang belum diproses
  getLaporanMasuk: () =>
    apiFetch("/staf/laporan"),

  // Ambil daftar kepala unit (untuk dropdown distribusi)
  getKepalaUnit: () =>
    apiFetch("/staf/kepala-unit"),

  // Distribusikan laporan ke satu atau beberapa unit
  distribusiLaporan: (body: { id_laporan: number; unit_tujuan: string[] }) =>
    apiFetch("/staf/boxing", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Lihat semua proses & pemantauan berjalan
  getProsesMonitor: () =>
    apiFetch("/staf/proses"),

  // Input hasil pemantauan setelah kepala unit submit pelaksanaan
  inputHasilPemantauan: (body: {
    id_boxing: number;
    hasil: string;
    catatan?: string;
    kp_pemantauan?: string;
  }) =>
    apiFetch("/staf/pemantauan", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Rekapitulasi semua laporan dari awal sampai selesai
  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),
};

// ─────────────────────────────────────────────────────────────────────────────
// KEPALA UNIT — semua endpoint butuh token role = kepala_unit
// ✅ BLOK INI YANG DITAMBAHKAN (sebelumnya tidak ada)
// ─────────────────────────────────────────────────────────────────────────────
export const kepalaUnitApi = {
  // Tab "Ketidaksesuaian Masuk"
  // Ambil semua borang yang didistribusikan Staf P4M ke unit ini
  getLaporanMasuk: () =>
    apiFetch("/kepala-unit/laporan"),

  // Kirim rancangan tindakan (penyebab + rencana)
  // Jika sudah pernah dikirim dan status = revisi → akan diupdate
  submitRancangan: (body: {
    id_boxing: number;
    penyebab: string;
    rencana_tindakan: string;
  }) =>
    apiFetch("/kepala-unit/rancangan", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Tab "Laporan Hasil"
  // Ambil boxing yang rancangan-nya sudah disetujui Staf P4M
  getLaporanHasil: () =>
    apiFetch("/kepala-unit/laporan-hasil"),

  // Submit hasil nyata pelaksanaan tindakan + upload bukti (opsional)
  // Kirim sebagai FormData karena ada file upload
  submitPelaksanaan: (formData: FormData) =>
    apiFetch("/kepala-unit/pelaksanaan", {
      method: "POST",
      body: formData,
    }),
};