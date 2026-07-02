'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Bell, BellOff, Globe, Key, Save, Lock } from 'lucide-react';

export default function PengaturanStaffPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifikasi, setNotifikasi] = useState(true);
  const [bahasa, setBahasa] = useState('id');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'staf_p4m') {
      router.replace('/staff-p4m/login');
      return;
    }
    // Load preferences
    const savedDark = localStorage.getItem('darkMode');
    if (savedDark === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    const savedNotif = localStorage.getItem('notifikasi');
    if (savedNotif !== null) setNotifikasi(savedNotif === 'true');
    const savedLang = localStorage.getItem('bahasa');
    if (savedLang) setBahasa(savedLang);
    setIsChecking(false);
  }, [router]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  const handleSave = () => {
    localStorage.setItem('notifikasi', String(notifikasi));
    localStorage.setItem('bahasa', bahasa);
    alert('✅ Pengaturan berhasil disimpan!');
  };

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">⚙️ Pengaturan</h2>

      {/* Dark Mode */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={22} className="text-blue-500" /> : <Sun size={22} className="text-yellow-500" />}
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-white">Mode Gelap</h3>
              <p className="text-xs text-gray-400">Tampilan gelap untuk kenyamanan mata</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${darkMode ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Notifikasi */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notifikasi ? <Bell size={22} className="text-blue-500" /> : <BellOff size={22} className="text-gray-400" />}
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-white">Notifikasi</h3>
              <p className="text-xs text-gray-400">Terima notifikasi aplikasi</p>
            </div>
          </div>
          <button
            onClick={() => setNotifikasi(!notifikasi)}
            className={`relative w-12 h-6 rounded-full transition ${notifikasi ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${notifikasi ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Ganti Password */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <Key size={22} className="text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-white">Ganti Password</h3>
            <p className="text-xs text-gray-400">Ubah password akun Anda</p>
          </div>
        </div>
        <div className="space-y-3">
          <input type="password" placeholder="Password Lama" className="w-full bg-gray-50 dark:bg-slate-700 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          <input type="password" placeholder="Password Baru" className="w-full bg-gray-50 dark:bg-slate-700 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          <input type="password" placeholder="Konfirmasi Password" className="w-full bg-gray-50 dark:bg-slate-700 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition">
            <Lock size={14} /> Ubah Password
          </button>
        </div>
      </div>

      {/* Simpan */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition">
          <Save size={16} /> Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}