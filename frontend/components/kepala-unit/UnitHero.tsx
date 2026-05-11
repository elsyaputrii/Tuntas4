"use client";
import { useRouter } from "next/navigation";
import { useState } from "react"; // ← tidak perlu import useEffect lagi

// Fungsi helper untuk baca field dari localStorage
// Dipanggil langsung sebagai lazy initializer, bukan di dalam useEffect
function getUserField(key: "nama" | "unit"): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    return JSON.parse(raw)[key] || "";
  } catch {
    return "";
  }
}

export default function UnitHero() {
  const router = useRouter();

  // ✅ FIX: lazy initializer () => ... dijalankan sekali saat mount
  // Tidak perlu useEffect + setState → tidak ada error cascading renders
  const [namaUser] = useState(() => getUserField("nama"));
  const [unit]     = useState(() => getUserField("unit"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.replace("/kepala-unit/login");
  };

  return (
    <div className="bg-[#4d5e71] p-8 text-white mb-6 shadow-md border-b-4 border-[#5da0dd] flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-tight uppercase">
          Halaman Kerja Kepala Unit <br />
          Aplikasi Pengelolaan Ketidaksesuaian Polibatam
        </h1>
        {(namaUser || unit) && (
          <p className="text-[#5da0dd] text-sm mt-2">
            {namaUser && <span>{namaUser}</span>}
            {namaUser && unit && <span className="mx-2">·</span>}
            {unit && <span>Unit {unit}</span>}
          </p>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="flex-shrink-0 ml-6 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow transition-all"
      >
        Logout
      </button>
    </div>
  );
}