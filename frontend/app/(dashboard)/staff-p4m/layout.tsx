'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  User,
  ChevronDown,
} from 'lucide-react';

export default function StaffP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.push('/staff-p4m/login');
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      if (user.role !== 'staf_p4m') {
        router.push('/staff-p4m/login');
      }
    } catch {
      router.push('/staff-p4m/login');
    }
  }, [router]);

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // Menu
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/staff-p4m' },
    { id: 'laporan-masuk', label: 'Laporan Masuk', icon: <ClipboardList size={18} />, path: '/staff-p4m/laporan-masuk' },
    { id: 'proses-pantau', label: 'Proses & Pantau', icon: <BarChart3 size={18} />, path: '/staff-p4m/proses-pantau' },
    { id: 'rekapitulasi', label: 'Rekapitulasi', icon: <FileText size={18} />, path: '/staff-p4m/rekapitulasi' },
    { id: 'data-akun', label: 'Data Akun', icon: <Users size={18} />, path: '/staff-p4m/data-akun' },
  ];

  const isActive = (path: string) => pathname === path;

  // Login page = no sidebar
  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }

  return (
    // ===== BACKGROUND UTAMA (abu-abu terang) =====
    <div className="h-screen bg-[#ececec] dark:bg-slate-900 flex overflow-hidden">
      
      {/* ========== SIDEBAR (biru tua gelap) ========== */}
      <aside
        className={`bg-gradient-to-b from-[#18253d] to-[#08142b] dark:from-slate-800 dark:to-slate-900
        text-white transition-all duration-300 flex flex-col shadow-2xl
        ${sidebarOpen ? 'w-[260px]' : 'w-[85px]'}`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white flex items-center justify-center">
  <img src="/LogoTuntas.png" alt="Logo" className="w-full h-full object-cover scale-125" />
</div>
              <div>
                <h1 className="font-bold text-base tracking-wide">
                  <span className="bg-gradient-to-r from-[#d4af37] via-yellow-200 to-[#d4af37] bg-[length:200%_auto] bg-clip-text text-transparent animate-shine">
                    TUNTAS
                  </span>
                  <span className="ml-1 text-white">Polibatam</span>
                </h1>
                <p className="text-[9px] text-slate-300">Sistem Pengaduan Kampus</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-full overflow-hidden bg-white flex items-center justify-center">
  <img src="/LogoTuntas.png" alt="Logo" className="w-full h-full object-cover scale-125" />
</div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-6 px-3 flex flex-col gap-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm w-full text-left
              ${isActive(item.path)
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10 mt-auto">
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/staff-p4m/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition"
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ========== AREA KANAN ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ===== NAVBAR (gradient biru abu) ===== */}
        <div className="bg-gradient-to-r from-[#3b4b65] to-[#51627e] dark:from-slate-700 dark:to-slate-600 rounded-[22px] shadow-lg mx-5 mt-5 px-6 py-5 text-white">
          <div className="flex justify-between items-center">
            {/* Kiri: Title */}
            <div>
              <h1 className="text-[20px] font-bold leading-tight">
                Transformasi Tata Kelola Organisasi:
                <br />
                Aplikasi Pengelolaan Ketidaksesuaian Polibatam
              </h1>
              <p className="mt-2 text-sm text-slate-200 flex items-center gap-2">
                👤 Admin Staff P4M
              </p>
            </div>

            {/* Kanan: Ikon */}
            <div className="flex items-center gap-2">
              {/* Dark Mode */}
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/10 transition">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifikasi */}
              <div className="relative">
                <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-full hover:bg-white/10 transition">
                  <Bell size={18} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    3
                  </span>
                </button>
                {showNotif && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                    <div className="p-3 border-b dark:border-slate-700 font-semibold text-slate-700 dark:text-white flex justify-between">
                      <span>Notifikasi</span>
                      <button onClick={() => setShowNotif(false)}><X size={16} /></button>
                    </div>
                    <div className="p-4 text-center text-slate-400">Tidak ada notifikasi</div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1 p-2 rounded-full hover:bg-white/10 transition">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <ChevronDown size={14} />
                </button>
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                    <div className="p-3 border-b dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-700 dark:text-white">Admin Staff</p>
                      <p className="text-xs text-slate-400">staff@polibatam.ac.id</p>
                    </div>
                    <div className="p-2">
                      <button className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                        Profil Saya
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                        Pengaturan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== KONTEN UTAMA ===== */}
        <div className="flex-1 mx-5 mt-6 mb-5 bg-[#e9edf2] dark:bg-slate-800 rounded-[22px] p-5 min-w-0 overflow-x-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-md overflow-hidden min-h-[500px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}