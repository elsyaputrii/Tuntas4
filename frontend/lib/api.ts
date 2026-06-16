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

  // Tab Proses & Pantau (pantau saja — tutup laporan hanya Ka P4M)
  getProsesMonitor: () =>
    apiFetch("/staf/proses"),

  inputHasilPemantauan: (body: {
    id_boxing: number;
    hasil: string;
    catatan?: string;
    kp_pemantauan?: string;
  }) =>
    apiFetch("/staf/pemantauan", { method: "POST", body: JSON.stringify(body) }),

  setKeputusanBoxing: (
    id_boxing: number,
    keputusan: "selesai" | "belum" | "lanjut" | "ditindak_lanjut"
  ) =>
    apiFetch("/staf/keputusan-boxing", {
      method: "PATCH",
      body: JSON.stringify({ id_boxing, keputusan }),
    }),

  setApprovalBoxing: (
    id_boxing: number,
    approval: "diterima" | "ditolak"
  ) =>
    apiFetch("/staf/approval-boxing", {
      method: "PATCH",
      body: JSON.stringify({ id_boxing, approval }),
    }),

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
  getProsesMonitor: () => apiFetch("/ka-p4m/proses"),

  keputusanKa: (body: {
    id_rancangan: number;
    keputusan: "ditindaklanjuti" | "tidak";
    aksi_masukan?: string;
  }) =>
    apiFetch("/ka-p4m/keputusan", { method: "PATCH", body: JSON.stringify(body) }),
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