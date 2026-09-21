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
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
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

  // ✅ Signature 3 argumen terpisah (sesuai ProcessMonitorTable.tsx).
  // Normalisasi nilai approval dari UI ("siap"/"belum_siap") ke nilai
  // yang backend harapkan ("diterima"/"ditolak").
  setApprovalHasil: (id_boxing: number, approval: string, catatan: string) => {
    const normalized =
      approval === "siap" || approval === "diterima"
        ? "diterima"
        : "ditolak";

    return apiFetch("/staf/approval-hasil", {
      method: "PATCH",
      body: JSON.stringify({
        id_boxing,
        approval: normalized,
        catatan,
      }),
    });
  },

  // ✅ FIX: terima parameter opsional `tahun` — sesuai backend
  //    (GET /api/staf/rekap/arsip?tahun=xxxx)
  //    Kalau tahun undefined → ambil semua tahun.
  getArsipRekap: (tahun?: number) =>
    apiFetch(`/staf/rekap/arsip${tahun ? `?tahun=${tahun}` : ""}`),

  // ✅ FIX: path upload sesuai backend stafRoutes.js:
  //    POST /api/staf/rekap/arsip/upload
  uploadArsipRekap: (formData: FormData) =>
    apiFetch("/staf/rekap/arsip/upload", {
      method: "POST",
      body: formData,
    }),

  // ✅ FIX: pakai query `?tahun=` — sesuai backend deleteArsipRekap
  //    DELETE /api/staf/rekap/arsip?tahun=2024
  deleteArsipRekap: (tahun: number) =>
    apiFetch(`/staf/rekap/arsip?tahun=${tahun}`, { method: "DELETE" }),
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

  getRiwayat: () =>
    apiFetch("/kepala-unit/riwayat"),

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
// KA P4M
// ─────────────────────────────────────────────────────────────────────────────
export interface KeputusanKaPayload {
  id_rancangan: number;
  keputusan: "ditindaklanjuti" | "tidak";
  aksi_masukan: string;
}

export const kaP4MApi = {
  getProsesMonitor: () =>
    apiFetch("/ka-p4m/proses"),

  keputusanKa: (body: KeputusanKaPayload) =>
    apiFetch("/ka-p4m/keputusan", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getKepalaUnitLaporanHasil: () =>
    apiFetch("/ka-p4m/kepala-unit/laporan-hasil"),

  getKepalaUnitLaporanMasuk: () =>
    apiFetch("/ka-p4m/kepala-unit/laporan-masuk"),
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFIKASI
// ─────────────────────────────────────────────────────────────────────────────
export const notifikasiApi = {
  getAll: () =>
    apiFetch("/notifikasi"),

  getList: () =>
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
// USER  — ⚠️ Backend mount di /api/users (PLURAL)
// ─────────────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll: () =>
    apiFetch("/users"),

  // ✅ Alias getAll — unwrap `.data` supaya caller dapat array langsung.
  getUsers: async () => {
    const res = await apiFetch("/users");
    return Array.isArray(res) ? res : (res.data ?? []);
  },

  getById: (id: number) =>
    apiFetch(`/users/${id}`),

  getByRole: (role: string) =>
    apiFetch(`/users?role=${encodeURIComponent(role)}`),

  // ✅ FIX: parameter `body` tipe-nya longgar (Partial) supaya cocok
  //    dengan pemanggilan dari data-akun/page.tsx yang pakai
  //    `formData: Partial<User>`. Backend yang akan validasi.
  createUser: (body: {
    name: string;
    email: string;
    password: string;
    role: string;
    nip?: string;
    unit?: string;
    status?: string;
  }) =>
    apiFetch("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (id: number, body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    nip?: string;
    unit?: string;
    status?: string;
  }) =>
    apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteUser: (id: number) =>
    apiFetch(`/users/${id}`, { method: "DELETE" }),

  // ✅ FIX: parameter kedua adalah FormData (bukan File mentah).
  //    Sesuai backend userRoutes.js:
  //    uploadSignature.single("tanda_tangan")
  //    Jadi caller harus bikin FormData dulu, append File ke field
  //    bernama "tanda_tangan", baru kirim.
  uploadTandaTangan: (id: number, formData: FormData) =>
    apiFetch(`/users/${id}/tanda-tangan`, {
      method: "POST",
      body: formData,
    }),

  deleteTandaTangan: (id: number) =>
    apiFetch(`/users/${id}/tanda-tangan`, { method: "DELETE" }),
};