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

// ── CIVITAS API — tanpa login ─────────────────────────────
export const civitasApi = {
  kirimLaporan: (formData: FormData) =>
    apiFetch("/civitas/laporan", { method: "POST", body: formData }),

  cekStatus: (kode: string) =>
    apiFetch(`/civitas/laporan/cek?kode=${encodeURIComponent(kode)}`),

  getRiwayat: (nama?: string) =>
    apiFetch(`/civitas/laporan${nama ? `?nama=${encodeURIComponent(nama)}` : ""}`),
};

// ── AUTH API ─────────────────────────────────────────────
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

  // ── BARU: Forgot & Reset Password ──────────────────────
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

// ── STAF P4M API — wajib login ───────────────────────────
export const stafApi = {
  getLaporanMasuk: () => apiFetch("/staf/laporan"),
  getKepalaUnit:   () => apiFetch("/staf/kepala-unit"),
  distribusiLaporan: (body: { id_laporan: number; id_kepala: number; id_standar?: number }) =>
    apiFetch("/staf/boxing", { method: "POST", body: JSON.stringify(body) }),
  getProsesMonitor: () => apiFetch("/staf/proses"),
  inputHasilPemantauan: (body: {
    id_boxing: number; hasil: string; catatan?: string; kp_pemantauan?: string;
  }) => apiFetch("/staf/pemantauan", { method: "POST", body: JSON.stringify(body) }),
  setStatusLaporan: (id_laporan: number, status: string) =>
    apiFetch("/staf/status", { method: "PATCH", body: JSON.stringify({ id_laporan, status }) }),
  getRekapitulasi: () => apiFetch("/staf/rekap"),
};