// FILE: frontend/lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Ambil token dari localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Set Content-Type JSON kalau bukan FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Tambahkan token kalau ada
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

// ── AUTH API — login per role ─────────────────────────────
export const authApi = {
  // Login Staf P4M → POST /api/auth/staf/login
  loginStaf: (email: string, password: string) =>
    apiFetch("/auth/staf/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Login Ka P4M → POST /api/auth/kap4m/login
  loginKaP4M: (email: string, password: string) =>
    apiFetch("/auth/kap4m/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Login Kepala Unit → POST /api/auth/kepala-unit/login
  loginKepalaUnit: (email: string, password: string) =>
    apiFetch("/auth/kepala-unit/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Cek token aktif
  getMe: () => apiFetch("/auth/me"),
};

// ── STAF P4M API — wajib login ───────────────────────────
export const stafApi = {
  // Tab Laporan Masuk
  getLaporanMasuk: () =>
    apiFetch("/staf/laporan"),

  getKepalaUnit: () =>
    apiFetch("/staf/kepala-unit"),

  distribusiLaporan: (body: { id_laporan: number; id_kepala: number; id_standar?: number }) =>
    apiFetch("/staf/boxing", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Tab Proses & Pantau
  getProsesMonitor: () =>
    apiFetch("/staf/proses"),

  inputHasilPemantauan: (body: {
    id_boxing:      number;
    hasil:          string;
    catatan?:       string;
    kp_pemantauan?: string;
  }) =>
    apiFetch("/staf/pemantauan", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  setStatusLaporan: (id_laporan: number, status: string) =>
    apiFetch("/staf/status", {
      method: "PATCH",
      body: JSON.stringify({ id_laporan, status }),
    }),

  // Tab Rekapitulasi
  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),
};