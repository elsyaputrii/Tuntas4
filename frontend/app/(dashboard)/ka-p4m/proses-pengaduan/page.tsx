'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KaP4MReviewTable from "@/components/ka-p4m/KaP4MReviewTable";

export default function ProsesPengaduanPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [namaUser, setNamaUser] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "ka_p4m") {
      router.replace("/ka-p4m/login");
      return;
    }
    // ✅ FIX ESLint react-hooks/set-state-in-effect (lihat catatan yang sama
    // di ka-p4m/hasil-tindak-lanjut/page.tsx)
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setNamaUser(user.nama || "");
      } catch { /* ignore */ }
      setIsChecking(false);
    });
    return () => { cancelled = true; };
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
          📋 Proses Pengaduan
        </h2>
        {namaUser && (
          <p className="text-sm text-gray-500">👤 {namaUser}</p>
        )}
      </div>
      
      <KaP4MReviewTable />
    </div>
  );
}