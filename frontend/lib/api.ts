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

  // ❌ DIHAPUS: setApprovalBoxing. Keputusan "diterima/ditolak" atas hasil
  // tindak lanjut unit sekarang HANYA wewenang Ka P4M — lihat
  // kaP4MApi.setApprovalHasil di bawah. Staf P4M cuma pantau lewat
  // getProsesMonitor/getRekapitulasi, tidak lagi punya endpoint untuk
  // memutuskan ulang-atau-tidak.

  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),

  // ── Arsip data tahun lalu (Upload Excel s/d 10 tahun ke belakang) ──
  uploadArsipRekap: (formData: FormData) =>
    apiFetch("/staf/rekap/arsip/upload", { method: "POST", body: formData }),
  getArsipRekap: (tahun?: number) =>
    apiFetch(`/staf/rekap/arsip${tahun ? `?tahun=${tahun}` : ""}`),
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

  // ✅ FITUR BARU: Ka P4M memantau data Kepala Unit (read-only, semua unit)
  getKepalaUnitLaporanMasuk: () => apiFetch("/ka-p4m/kepala-unit/laporan-masuk"),
  getKepalaUnitLaporanHasil: () => apiFetch("/ka-p4m/kepala-unit/laporan-hasil"),

  // ✅ FITUR PINDAH: dulu stafApi.setApprovalBoxing. Sekarang keputusan
  // "diterima" (→ laporan otomatis Selesai) atau "ditolak" (→ balik ke
  // Kepala Unit untuk revisi hasil) atas hasil tindak lanjut unit adalah
  // wewenang Ka P4M, bukan Staf P4M lagi.
  setApprovalHasil: (
    id_boxing: number,
    approval: "diterima" | "ditolak",
    catatan: string
  ) =>
    apiFetch("/ka-p4m/approval-hasil", {
      method: "PATCH",
      body: JSON.stringify({ id_boxing, approval, catatan }),
    }),
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

// ─────────────────────────────────────────────
// USERS — kelola akun (Data Akun), khusus staf_p4m
// ─────────────────────────────────────────────
export const userApi = {
  getUsers: () => apiFetch("/users"),
  createUser: (body: Record<string, unknown>) =>
    apiFetch("/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: number, body: Record<string, unknown>) =>
    apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id: number) =>
    apiFetch(`/users/${id}`, { method: "DELETE" }),
  // Tanda tangan (TTD) digital akun — ditempel otomatis di PDF
  uploadTandaTangan: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("tanda_tangan", file);
    return apiFetch(`/users/${id}/tanda-tangan`, { method: "POST", body: formData });
  },
  deleteTandaTangan: (id: number) =>
    apiFetch(`/users/${id}/tanda-tangan`, { method: "DELETE" }),
};