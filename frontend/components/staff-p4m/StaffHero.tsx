"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffHero() {
  const router            = useRouter();
  const [nama, setNama]   = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("user");

    // Kalau tidak ada data → redirect ke login
    if (!raw) {
      router.push("/staff-p4m/login");
      return;
    }

    try {
      const user = JSON.parse(raw) as { nama?: string; role?: string };

      // Kalau role bukan staf_p4m → redirect
      if (user.role !== "staf_p4m") {
        router.push("/staff-p4m/login");
        return;
      }

      // Baru set nama setelah semua validasi lolos
      setNama(user.nama ?? "");
    } catch {
      router.push("/staff-p4m/login");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/staff-p4m/login");
  }

  return (
    <div className="bg-dark-header p-8 text-white mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold leading-tight">
        Transformasi Tata Kelola <br />
        Organisasi: Aplikasi Pengelolaan Ketidaksesuaian Polibatam
      </h1>

      <div className="flex flex-col items-end gap-2 ml-6 shrink-0">
        {nama && (
          <p className="text-sm text-blue-200 font-medium">👤 {nama}</p>
        )}
        <button
          onClick={handleLogout}
          className="text-xs bg-white text-dark-header font-bold px-4 py-1.5 rounded hover:bg-gray-100 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}