'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  User,
  ChevronDown,
  Building2,
  ArrowLeft,
  Bell,
} from 'lucide-react';

export default function KaP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.push('/ka-p4m/login');
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      if (user.role !== 'ka_p4m') {
        router.push('/ka-p4m/login');
      }
    } catch {
      router.push('/ka-p4m/login');
    }
  }, [router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      path: '/ka-p4m'
    },
    {
      id: 'proses-pengaduan',
      label: 'Proses Pengaduan',
      icon: <ClipboardList size={18} />,
      path: '/ka-p4m/proses-pengaduan'
    },
    {
      id: 'hasil-tindak-lanjut',
      label: 'Hasil Tindak Lanjut',
      icon: <CheckCircle2 size={18} />,
      path: '/ka-p4m/hasil-tindak-lanjut'
    },
    {
      id: 'kepala-unit',
      label: 'Kepala Unit',
      icon: <Building2 size={18} />,
      path: '/ka-p4m/kepala-unit'
    },
  ];

  const kepalaUnitMenuItems = [
    {
      id: 'ku-dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      path: '/ka-p4m/kepala-unit'
    },
    {
      id: 'ku-ketidaksesuaian-masuk',
      label: 'Ketidaksesuaian Masuk',
      icon: <ClipboardList size={18} />,
      path: '/ka-p4m/kepala-unit/ketidaksesuaian-masuk'
    },
    {
      id: 'ku-laporan-hasil',
      label: 'Laporan Hasil',
      icon: <CheckCircle2 size={18} />,
      path: '/ka-p4m/kepala-unit/laporan-hasil'
    },
  ];

  const isActive = (path: string) => pathname === path;

  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }

  const isKepalaUnitSection = pathname?.startsWith('/ka-p4m/kepala-unit');

  if (isKepalaUnitSection) {
    return (
      <div className="h-screen bg-[#ececec] dark:bg-slate-900 flex overflow-hidden">
        <aside
          className={`bg-linear-to-b from-[#18253d] to-[#08142b] dark:from-slate-800 dark:to-slate-900
          text-white transition-all duration-300 flex flex-col shadow-2xl h-screen sticky top-0
          ${sidebarOpen ? 'w-65' : 'w-21.25'}`}
        >
          <div className={`px-5 py-5 border-b border-white/10 flex items-center ${sidebarOpen ? 'justify-between' : 'flex-col justify-center gap-3'}`}>
            <div className={`flex items-center ${sidebarOpen ? 'gap-2' : 'flex-col'}`}>
              <div className={`shrink-0 ${sidebarOpen ? 'w-11 h-11' : 'w-10 h-10'} rounded-full overflow-hidden bg-white flex items-center justify-center`}>
                <Image
                  src="/LogoTuntas.png"
                  alt="Logo"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover scale-125"
                  priority
                />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-base tracking-wide">
                    <span className="bg-linear-to-r from-[#d4af37] via-yellow-200 to-[#d4af37] bg-size[200%_auto] bg-clip-text text-transparent animate-shine">
                      TUNTAS
                    </span>
                    <span className="ml-1 text-white">Polibatam</span>
                  </h1>
                  <p className="text-[9px] text-slate-300">Sistem Pengaduan Kampus</p>
                </div>
              )}
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

          <button
            onClick={() => router.push('/ka-p4m')}
            className="flex items-center gap-3 px-5 py-3 mt-3 text-slate-400 hover:text-white hover:bg-white/5 transition text-xs"
          >
            <ArrowLeft size={16} />
            {sidebarOpen && <span>Kembali ke Ka P4M</span>}
          </button>

          <nav className="flex-1 overflow-y-auto mt-2 px-3 flex flex-col gap-1">
            {kepalaUnitMenuItems.map((item) => (
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

          <div className="p-4 border-t border-white/10 shrink-0">
            <button
              onClick={() => {
                localStorage.clear();
                router.push('/ka-p4m/login');
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition"
            >
              <LogOut size={18} />
              {sidebarOpen && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="bg-linear-to-r from-[#3b4b65] to-[#51627e] dark:from-slate-700 dark:to-slate-600 rounded-[22px] shadow-lg mx-5 mt-5 px-6 py-5 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-[20px] font-bold leading-tight">
                  Transformasi Tata Kelola Organisasi:
                  <br />
                  Aplikasi Pengelolaan Ketidaksesuaian Polibatam
                </h1>
                <p className="mt-2 text-sm text-slate-200 flex items-center gap-2">
                  👤 Kepala Unit P4M (Ka P4M)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/10 transition">
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="relative">
                  <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-full hover:bg-white/10 transition">
                    <Bell size={18} />
                  </button>
                  {showNotif && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                      <div className="p-3 border-b flex justify-between">
                        <span className="font-semibold text-slate-700 dark:text-white">Notifikasi</span>
                        <button onClick={() => setShowNotif(false)}><X size={16} className="text-slate-700 dark:text-white" /></button>
                      </div>
                      <div className="p-8 text-center text-slate-400 text-sm">
                        Belum ada notifikasi
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1 p-2 rounded-full hover:bg-white/10 transition">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <ChevronDown size={14} />
                  </button>
                  {showProfile && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                      <div className="p-3 border-b">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">KA-P4M</p>
                        <p className="text-xs text-slate-400">ka.p4m@polibatam.ac.id</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            router.push('/ka-p4m/profil');
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          Profil Saya
                        </button>
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            router.push('/ka-p4m/pengaturan');
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          Pengaturan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto mx-5 mt-6 mb-5 bg-[#e9edf2] dark:bg-slate-800 rounded-[22px] p-5">
            <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-md overflow-hidden min-h-125 p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#ececec] dark:bg-slate-900 flex overflow-hidden">
      <aside
        className={`bg-linear-to-b from-[#18253d] to-[#08142b] dark:from-slate-800 dark:to-slate-900
        text-white transition-all duration-300 flex flex-col shadow-2xl h-screen sticky top-0
        ${sidebarOpen ? 'w-65' : 'w-21.25'}`}
      >
        <div className={`px-5 py-5 border-b border-white/10 flex items-center ${sidebarOpen ? 'justify-between' : 'flex-col justify-center gap-3'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-2' : 'flex-col'}`}>
            <div className={`shrink-0 ${sidebarOpen ? 'w-11 h-11' : 'w-10 h-10'} rounded-full overflow-hidden bg-white flex items-center justify-center`}>
              <Image
                src="/LogoTuntas.png"
                alt="Logo"
                width={44}
                height={44}
                className="w-full h-full object-cover scale-125"
                priority
              />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-base tracking-wide">
                  <span className="bg-linear-to-r from-[#d4af37] via-yellow-200 to-[#d4af37] bg-size[200%_auto] bg-clip-text text-transparent animate-shine">
                    TUNTAS
                  </span>
                  <span className="ml-1 text-white">Polibatam</span>
                </h1>
                <p className="text-[9px] text-slate-300">Sistem Pengaduan Kampus</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto mt-6 px-3 flex flex-col gap-1">
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

        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/ka-p4m/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition"
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="bg-linear-to-r from-[#3b4b65] to-[#51627e] dark:from-slate-700 dark:to-slate-600 rounded-[22px] shadow-lg mx-5 mt-5 px-6 py-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[20px] font-bold leading-tight">
                Transformasi Tata Kelola Organisasi:
                <br />
                Aplikasi Pengelolaan Ketidaksesuaian Polibatam
              </h1>
              <p className="mt-2 text-sm text-slate-200 flex items-center gap-2">
                👤 KA-P4M
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/10 transition">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative">
                <button onClick={() => setShowNotif(!showNotif)} className="p-2 rounded-full hover:bg-white/10 transition">
                  <Bell size={18} />
                </button>
                {showNotif && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                    <div className="p-3 border-b flex justify-between">
                      <span className="font-semibold text-slate-700 dark:text-white">Notifikasi</span>
                      <button onClick={() => setShowNotif(false)}><X size={16} className="text-slate-700 dark:text-white" /></button>
                    </div>
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Belum ada notifikasi
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1 p-2 rounded-full hover:bg-white/10 transition">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <ChevronDown size={14} />
                </button>
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                    <div className="p-3 border-b">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">KA-P4M</p>
                      <p className="text-xs text-slate-400">ka.p4m@polibatam.ac.id</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          router.push('/ka-p4m/profil');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        Profil Saya
                      </button>
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          router.push('/ka-p4m/pengaturan');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        Pengaturan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mx-5 mt-6 mb-5 bg-[#e9edf2] dark:bg-slate-800 rounded-[22px] p-5">
          <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-md overflow-hidden min-h-125 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}