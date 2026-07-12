'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KaP4MHasilTable from "@/components/ka-p4m/KaP4MHasilTable";

export default function HasilTindakLanjutPage() {
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

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          ✅ Hasil Tindak Lanjut
        </h2>
        {namaUser && (
          <p className="text-sm text-gray-500">👤 {namaUser}</p>
        )}
      </div>

      <KaP4MHasilTable />
    </div>
  );
}