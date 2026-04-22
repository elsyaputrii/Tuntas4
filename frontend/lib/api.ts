// ============================================================
// FILE: frontend/lib/api.ts
// Helper API - Civitas TIDAK perlu token/login sama sekali
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Hanya set Content-Type JSON jika bukan FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Terjadi kesalahan pada server");
  }

  return data;
}

// ============================================================
// CIVITAS API - semua tanpa token
// ============================================================
export const civitasApi = {
  // Kirim laporan baru (nama + status + jenis + deskripsi + file opsional)
  kirimLaporan: (formData: FormData) =>
    apiFetch("/civitas/laporan", { method: "POST", body: formData }),

  // Cek status laporan berdasarkan kode (LAP-00001) atau id
  cekStatus: (kode: string) =>
    apiFetch(`/civitas/laporan/cek?kode=${encodeURIComponent(kode)}`),

  // Lihat semua laporan (opsional filter by nama)
  getRiwayat: (nama?: string) =>
    apiFetch(`/civitas/laporan${nama ? `?nama=${encodeURIComponent(nama)}` : ""}`),
};