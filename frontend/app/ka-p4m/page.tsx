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
    <div className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-[#4E617A] p-8 shadow-md flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white font-bold text-xl uppercase leading-tight tracking-wide">
              Keputusan Ka P4M — Ditindaklanjuti atau Tidak
            </h1>
            {namaUser && (
              <p className="text-[#5da0dd] text-sm mt-2">👤 {namaUser}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            Logout
          </button>
        </div>

        <KaP4MReviewTable />
      </div>
    </div>
  );
}
