// FILE: frontend/lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
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
// ⚠️ HANYA ADA 1 BLOK authApi — jangan buat 2x (duplicate identifier error).
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  // ✅ Method generik — halaman login pakai `authApi.login(email, password)`.
  // Backend deteksi role dari email (endpoint /auth/login).
  login: (email: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

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
// STAF P4M
// ─────────────────────────────────────────────────────────────────────────────
export const stafApi = {
  getLaporanMasuk: () =>
    apiFetch("/staf/laporan"),

  getKepalaUnit: () =>
    apiFetch("/staf/kepala-unit"),

  distribusiLaporan: (body: { id_laporan: number; unit_tujuan: string[] }) =>
    apiFetch("/staf/boxing", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getProsesMonitor: () =>
    apiFetch("/staf/proses"),

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

  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),
};

// ─────────────────────────────────────────────────────────────────────────────
// KEPALA UNIT
// ─────────────────────────────────────────────────────────────────────────────
export const kepalaUnitApi = {
  getLaporanMasuk: () =>
    apiFetch("/kepala-unit/laporan"),

  submitRancangan: (body: {
    id_boxing: number;
    penyebab: string;
    rencana_tindakan?: string;
    tanggal_rencana?: string;
  }) =>
    apiFetch("/kepala-unit/rancangan", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getLaporanHasil: () =>
    apiFetch("/kepala-unit/laporan-hasil"),

  submitPelaksanaan: (formData: FormData) =>
    apiFetch("/kepala-unit/pelaksanaan", {
      method: "POST",
      body: formData,
    }),

  // ✅ CRUD rencana tindak lanjut (multi-item per laporan)
  getRencana: (id_boxing: number) =>
    apiFetch(`/kepala-unit/rencana/${id_boxing}`),

  addRencana: (body: { id_boxing: number; teks: string; tanggal: string }) =>
    apiFetch("/kepala-unit/rencana", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateRencana: (id: number, body: { teks: string; tanggal: string }) =>
    apiFetch(`/kepala-unit/rencana/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteRencana: (id: number) =>
    apiFetch(`/kepala-unit/rencana/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// KA P4M — dashboard, proses, hasil tindak lanjut
// ⚠️ MODULE INI WAJIB ADA — dipakai di app/(dashboard)/ka-p4m/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
export const kaP4MApi = {
  // Proses & pemantauan — dipakai di dashboard Ka P4M untuk lihat semua
  // rancangan/pengaduan yang masuk ke P4M
  getProsesMonitor: () =>
    apiFetch("/ka-p4m/proses"),
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFIKASI
// ─────────────────────────────────────────────────────────────────────────────
export const notifikasiApi = {
  getAll: () =>
    apiFetch("/notifikasi"),

  getUnreadCount: () =>
    apiFetch("/notifikasi/unread-count"),

  markAsRead: (id_notifikasi: number) =>
    apiFetch(`/notifikasi/${id_notifikasi}/read`, { method: "PATCH" }),

  markAllAsRead: () =>
    apiFetch("/notifikasi/read-all", { method: "PATCH" }),

  delete: (id_notifikasi: number) =>
    apiFetch(`/notifikasi/${id_notifikasi}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: () =>
    apiFetch("/user"),

  getById: (id: number) =>
    apiFetch(`/user/${id}`),

  getByRole: (role: string) =>
    apiFetch(`/user?role=${encodeURIComponent(role)}`),
};