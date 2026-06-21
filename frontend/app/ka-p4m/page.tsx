"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KaP4MReviewTable from "@/components/ka-p4m/KaP4MReviewTable";

export default function KaP4MPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [namaUser, setNamaUser] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "ka_p4m") {
      router.replace("/ka-p4m/login");
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setNamaUser(user.nama || "");
    } catch { /* ignore */ }
    setIsChecking(false);
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#4E617A] px-4 py-5 sm:px-8 sm:py-8 shadow-md flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <h1 className="text-white font-bold text-sm sm:text-xl uppercase leading-tight tracking-wide">
            Keputusan Ka P4M — Ditindaklanjuti atau Tidak
          </h1>
          {namaUser && (
            <p className="text-[#5da0dd] text-xs sm:text-sm mt-1 sm:mt-2 truncate">👤 {namaUser}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex-shrink-0 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-3 py-4 sm:px-6 sm:py-6 md:px-10 md:py-8">
        <KaP4MReviewTable />
      </div>
    </div>
  );
}