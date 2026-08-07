// FILE: frontend/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// ─────────────────────────────────────────────
// AUTO-LOGOUT — dipanggil setiap kali server bilang token invalid/expired
// ─────────────────────────────────────────────

// Login sekarang cuma satu pintu untuk semua role: /login
// (role tidak lagi menentukan path halaman login)
const LOGIN_PATH = "/login";

function forceLogout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");

  // Hindari redirect berulang kalau memang sudah di halaman login
  if (!window.location.pathname.includes("/login")) {
    window.location.href = LOGIN_PATH;
  }
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

  // Batas waktu tunggu respons server. Tanpa ini, kalau server lagi
  // down/query macet, fetch() bakal nunggu SELAMANYA — bikin UI nyangkut
  // di loading terus (spinner nggak pernah berhenti), padahal harusnya
  // dianggap gagal biar user bisa tahu & coba lagi.
  const TIMEOUT_MS = 15000; // 15 detik
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Server tidak merespons. Periksa koneksi Anda dan coba lagi.");
    }
    throw new Error("Gagal terhubung ke server. Periksa koneksi Anda dan coba lagi.");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  if (!response.ok) {
    // Kalau request ini SUDAH bawa token, tapi server tetap balas 401 →
    // artinya token expired/invalid (bukan sekadar gagal login biasa,
    // karena request login tidak membawa token). Auto-logout + redirect,
    // supaya user bisa langsung login ulang dari halaman login yang benar.
    if (response.status === 401 && token) {
      forceLogout();
      throw new Error("Sesi Anda telah berakhir. Silakan login ulang.");
    }

    // 403 = user SUDAH login tapi tidak berhak atas resource ini.
    // Kasus khusus: pesan role-mismatch ("... hanya untuk: ...") padahal
    // halaman ini sendiri sudah lolos pengecekan role saat load — ini
    // biasanya artinya localStorage token/role KETIMPA oleh login akun lain
    // di tab/browser yang sama (token & role disimpan global, bukan per-tab).
    // Untuk kasus ini, treat seperti sesi invalid: paksa logout + redirect,
    // supaya user tidak stuck dengan sesi campur-aduk.
    if (response.status === 403 && typeof window !== "undefined") {
      const isRoleMismatch = typeof data.message === "string" && data.message.includes("hanya untuk");
      if (isRoleMismatch) {
        forceLogout();
        throw new Error(
          "Sesi Anda tidak valid lagi untuk halaman ini — kemungkinan ada akun lain yang login di tab/browser yang sama. Silakan login ulang."
        );
      }
      window.alert(data.message || "Akses ditolak. Anda tidak memiliki izin untuk aksi ini.");
    }

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
  // Login gabungan — role dideteksi otomatis oleh backend dari akunnya
  login: (email: string, password: string) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  // Endpoint lama per-role, disimpan hanya untuk kompatibilitas
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

  getRekapitulasi: () =>
    apiFetch("/staf/rekap"),

  // ── Arsip data tahun lalu (Upload Excel s/d 10 tahun ke belakang) ──
  uploadArsipRekap: (formData: FormData) =>
    apiFetch("/staf/rekap/arsip/upload", { method: "POST", body: formData }),
  getArsipRekap: (tahun?: number) =>
    apiFetch(`/staf/rekap/arsip${tahun ? `?tahun=${tahun}` : ""}`),
  deleteArsipRekap: (tahun: number) =>
    apiFetch(`/staf/rekap/arsip?tahun=${tahun}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────
// KA P4M — semua endpoint butuh role = ka_p4m
// ─────────────────────────────────────────────
export const kaP4MApi = {
  getProsesMonitor: () => apiFetch("/ka-p4m/proses"),

  keputusanKa: (body: {
    id_rancangan: number;
    keputusan: "ditindaklanjuti" | "tidak";
    aksi_masukan?: string;
  }) =>
    apiFetch("/ka-p4m/keputusan", { method: "PATCH", body: JSON.stringify(body) }),

  getKepalaUnitLaporanMasuk: () => apiFetch("/ka-p4m/kepala-unit/laporan-masuk"),
  getKepalaUnitLaporanHasil: () => apiFetch("/ka-p4m/kepala-unit/laporan-hasil"),

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
  getRiwayat: () =>
    apiFetch("/kepala-unit/riwayat"),
};

// ─────────────────────────────────────────────
// NOTIFIKASI — lonceng 🔔, dipakai semua role (staf_p4m, kepala_unit, ka_p4m)
// ─────────────────────────────────────────────
export const notifikasiApi = {
  getList: () => apiFetch("/notifikasi"),
  getUnreadCount: () => apiFetch("/notifikasi/unread-count"),
  markAsRead: (id: number) =>
    apiFetch(`/notifikasi/${id}/read`, { method: "PATCH" }),
  markAllAsRead: () =>
    apiFetch("/notifikasi/read-all", { method: "PATCH" }),
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
  uploadTandaTangan: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("tanda_tangan", file);
    return apiFetch(`/users/${id}/tanda-tangan`, { method: "POST", body: formData });
  },
  deleteTandaTangan: (id: number) =>
    apiFetch(`/users/${id}/tanda-tangan`, { method: "DELETE" }),
};