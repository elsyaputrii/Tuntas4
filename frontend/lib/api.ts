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

// ─────────────────────────────────────────────
// CIVITAS (tanpa login — laporan anonim)
// ─────────────────────────────────────────────
export const civitasApi = {
  kirimLaporan: (formData: FormData) =>
    apiFetch("/civitas/laporan", { method: "POST", body: formData }),
  cekStatus: (kode: string) =>
    apiFetch(`/civitas/laporan/cek?kode=${encodeURIComponent(kode)}`),
  getRiwayat: (nama?: string) =>
    apiFetch(`/civitas/laporan${nama ? `?nama=${encodeURIComponent(nama)}` : ""}`),
};

// ─────────────────────────────────────────────
// AUTH — login, forgot password, reset password
// ─────────────────────────────────────────────
export const authApi = {
  loginStaf: (email: string, password: string) =>
    apiFetch("/auth/staf/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  loginKaP4M: (email: string, password: string) =>
    apiFetch("/auth/kap4m/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  loginKepalaUnit: (email: string, password: string) =>
    apiFetch("/auth/kepala-unit/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getMe: () => apiFetch("/auth/me"),
  forgotPassword: (email: string, role: string) =>
    apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email, role }) }),
  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword, confirmPassword }) }),
};

// ─────────────────────────────────────────────
// STAF P4M — semua endpoint butuh role = staf_p4m
// ─────────────────────────────────────────────
export const stafApi = {
  // Tab Laporan Masuk
  getLaporanMasuk: () =>
    apiFetch("/staf/laporan"),
  getKepalaUnit: () =>
    apiFetch("/staf/kepala-unit"),
  distribusiLaporan: (body: { id_laporan: number; unit_tujuan: string[] }) =>
    apiFetch("/staf/boxing", { method: "POST", body: JSON.stringify(body) }),

  // Tab Proses & Pantau
  getProsesMonitor: () =>
    apiFetch("/staf/proses"),

  // ✅ PERBAIKAN: reviewRancangan sekarang pakai /staf/review-rancangan
  // Route ini sudah ditambahkan di stafRoutes.js
  reviewRancangan: (body: {
    id_rancangan: number;
    status_review: "disetujui" | "tidak_disetujui" | "revisi";
    catatan?: string;
  }) =>
    apiFetch("/staf/review-rancangan", { method: "PATCH", body: JSON.stringify(body) }),

  inputHasilPemantauan: (body: {
    id_boxing: number;
    hasil: string;
    catatan?: string;
    kp_pemantauan?: string;
  }) =>
    apiFetch("/staf/pemantauan", { method: "POST", body: JSON.stringify(body) }),
  setStatusLaporan: (id_laporan: number, status: string) =>
    apiFetch("/staf/status", { method: "PATCH", body: JSON.stringify({ id_laporan, status }) }),

  // Tab Rekapitulasi
  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),
};

// ─────────────────────────────────────────────
// KA P4M — semua endpoint butuh role = ka_p4m
//
// PERBAIKAN UTAMA:
// Sebelumnya KaP4MReviewTable.tsx dan KaP4MHasilTable.tsx
// memanggil stafApi.getProsesMonitor() dan stafApi.reviewRancangan()
// → Ini salah! Ka P4M bukan Staf P4M → kena 403 Forbidden
//
// Sekarang Ka P4M punya endpoint sendiri: /api/ka-p4m/...
// ─────────────────────────────────────────────
export const kaP4MApi = {
  // Ambil semua data proses (untuk KaP4MReviewTable & KaP4MHasilTable)
  getProsesMonitor: () =>
    apiFetch("/ka-p4m/proses"),

  // Review rancangan dari Kepala Unit
  reviewRancangan: (body: {
    id_rancangan: number;
    status_review: "disetujui" | "tidak_disetujui" | "revisi";
    catatan?: string;
  }) =>
    apiFetch("/ka-p4m/review-rancangan", { method: "PATCH", body: JSON.stringify(body) }),

  // Ubah status laporan (CLOSE/OPEN) — keputusan akhir Ka P4M
  setStatusLaporan: (id_laporan: number, status: string) =>
    apiFetch("/ka-p4m/status", { method: "PATCH", body: JSON.stringify({ id_laporan, status }) }),
};

// ─────────────────────────────────────────────
// KEPALA UNIT — semua endpoint butuh role = kepala_unit
// ─────────────────────────────────────────────
export const kepalaUnitApi = {
  getLaporanMasuk: () =>
    apiFetch("/kepala-unit/laporan"),
  submitRancangan: (body: { id_boxing: number; penyebab: string; rencana_tindakan: string }) =>
    apiFetch("/kepala-unit/rancangan", { method: "POST", body: JSON.stringify(body) }),
  getLaporanHasil: () =>
    apiFetch("/kepala-unit/laporan-hasil"),
  submitPelaksanaan: (formData: FormData) =>
    apiFetch("/kepala-unit/pelaksanaan", { method: "POST", body: formData }),
};