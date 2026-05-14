"use client";
// FILE: frontend/app/ka-p4m/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KaP4MReviewTable from "@/components/ka-p4m/KaP4MReviewTable";
import KaP4MHasilTable  from "@/components/ka-p4m/KaP4MHasilTable";

export default function KaP4MPage() {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState<"review" | "hasil">("review");
  const [isChecking, setIsChecking] = useState(true);

  // ✅ Baca localStorage sekali saat init — tidak perlu useEffect untuk ini
  const [namaUser, setNamaUser] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("user");
      const user = JSON.parse(raw || "{}");
      return user.nama || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    // ✅ Semua setState dijalankan di dalam async function, bukan langsung di body effect
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const role  = localStorage.getItem("role");

      if (!token || role !== "ka_p4m") {
        router.replace("/ka-p4m/login");
        return;
      }

      setIsChecking(false); // ✅ hanya 1 setState, setelah validasi selesai
    };

    checkAuth();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.replace("/ka-p4m/login");
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header / Hero ─────────────────────────────── */}
        <div className="bg-[#4E617A] p-8 shadow-md flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white font-bold text-xl uppercase leading-tight tracking-wide">
              Selamat Datang Di Transformasi Tata Kelola <br />
              Organisasi: Aplikasi Pengelolaan Ketidaksesuaian <br />
              Polibatam
            </h1>
            {namaUser && (
              <p className="text-[#5da0dd] text-sm mt-2">👤 {namaUser} — Ka P4M</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 ml-6 bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow transition-all"
          >
            Logout
          </button>
        </div>

        {/* ── Navigasi 2 Tab ────────────────────────────── */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("review")}
            className={`px-6 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
              activeTab === "review"
                ? "bg-[#5da0dd] text-white"
                : "bg-[#5da0dd]/10 text-[#3a75ad] hover:bg-[#5da0dd]/20"
            }`}
          >
            📋 Review Rancangan Kepala Unit
          </button>

          <button
            onClick={() => setActiveTab("hasil")}
            className={`px-6 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
              activeTab === "hasil"
                ? "bg-[#5da0dd] text-white"
                : "bg-[#5da0dd]/10 text-[#3a75ad] hover:bg-[#5da0dd]/20"
            }`}
          >
            📊 Laporan Pemantauan Staf P4M
          </button>
        </div>

        {/* ── Konten Tab ────────────────────────────────── */}
        <div>
          {activeTab === "review" && <KaP4MReviewTable />}
          {activeTab === "hasil"  && <KaP4MHasilTable />}
        </div>

      </div>
    </div>
  );
}