"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffHero() {
  const router = useRouter();
  const [nama, setNama] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.push("/staff-p4m/login"); return; }

    try {
      const user = JSON.parse(raw) as { nama?: string; role?: string };
      if (user.role !== "staf_p4m") { router.push("/staff-p4m/login"); return; }
      setTimeout(() => setNama(user.nama ?? ""), 0);
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
    <div className="bg-dark-header p-4 sm:p-6 md:p-8 text-white mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">
          Transformasi Tata Kelola <br className="hidden sm:block" />
          Organisasi: Aplikasi Pengelolaan Ketidaksesuaian Polibatam
        </h1>
      </div>

      <div className="flex flex-col sm:items-end gap-2 shrink-0">
        {nama && (
          <p className="text-sm text-blue-200 font-medium">👤 {nama}</p>
        )}
        <button
          onClick={handleLogout}
          className="self-start sm:self-auto text-xs bg-white text-dark-header font-bold px-4 py-1.5 rounded hover:bg-gray-100 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}