"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffHero() {
  const router          = useRouter();
  const routerRef       = useRef(router); // ← simpan router ke ref, bukan dependency
  const [nama, setNama] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (!raw) {
      routerRef.current.push("/staff-p4m/login");
      return;
    }

    try {
      const user = JSON.parse(raw) as { nama?: string; role?: string };

      if (user.role !== "staf_p4m") {
        routerRef.current.push("/staff-p4m/login");
        return;
      }

      setNama(user.nama ?? "");
    } catch {
      routerRef.current.push("/staff-p4m/login");
    }
  }, []); // ← dependency array kosong, hanya jalan sekali saat mount

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/staff-p4m/login");
  }

  return (
    <div className="bg-[#4d5e71] p-8 text-white mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold leading-tight">
        Selamat Datang Di Transformasi Tata Kelola <br />
        Organisasi: Aplikasi Pengelolaan Ketidaksesuaian Polibatam
      </h1>

      <div className="flex flex-col items-end gap-2 ml-6 shrink-0">
        {nama && (
          <p className="text-sm text-blue-200 font-medium">👤 {nama}</p>
        )}
        <button
          onClick={handleLogout}
          className="text-xs bg-white text-[#4d5e71] font-bold px-4 py-1.5 rounded hover:bg-gray-100 transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}