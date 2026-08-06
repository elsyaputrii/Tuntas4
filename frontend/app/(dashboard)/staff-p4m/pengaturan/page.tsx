'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Bell,
  BellOff,
  Globe,
  Key,
  Save,
  CheckCircle,
  Lock,
} from 'lucide-react';

export default function PengaturanStaffPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return Boolean(token) && role === 'staf_p4m';
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('darkMode') === 'true';
  });
  const [notifikasiEmail, setNotifikasiEmail] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('notifikasiEmail');
    return saved !== null ? saved === 'true' : true;
  });
  const [bahasa, setBahasa] = useState(() => {
    if (typeof window === 'undefined') return 'id';
    return localStorage.getItem('bahasa') || 'id';
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auth check — redirect kalau belum login/role salah. Tidak perlu
  // setState di sini lagi karena status auth sudah dihitung langsung
  // saat inisialisasi state di atas (lihat useState isAuthorized).
  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/staff-p4m/login');
    }
  }, [isAuthorized, router]);

  // Sinkronkan class "dark" di <html> setiap kali darkMode berubah.
  // Ini murni memperbarui sistem eksternal (DOM), bukan setState di
  // dalam effect, jadi tidak memicu cascading render.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Simpan preferensi ke localStorage
    localStorage.setItem('notifikasiEmail', String(notifikasiEmail));
    localStorage.setItem('bahasa', bahasa);

    alert('✅ Pengaturan berhasil disimpan!');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('⚠️ Harap isi semua field password!');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('⚠️ Password baru dan konfirmasi tidak cocok!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('✅ Password berhasil diubah! Silakan login kembali.');

        // Password berubah → sesi lama nggak valid lagi secara logika,
        // jadi paksa logout & balik ke halaman login.
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.replace('/staff-p4m/login');
      } else {
        const data = await response.json().catch(() => null);
        alert(`❌ ${data?.message || 'Gagal mengubah password. Cek password lama!'}`);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('❌ Gagal mengubah password');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        ⚙️ Pengaturan
      </h2>

      {/* Mode Gelap */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={22} className="text-blue-500" /> : <Sun size={22} className="text-yellow-500" />}
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-white">Mode Gelap</h3>
              <p className="text-xs text-slate-400">Tampilan gelap untuk kenyamanan mata</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition ${
              darkMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
                darkMode ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notifikasi Email */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notifikasiEmail ? (
              <Bell size={22} className="text-blue-500" />
            ) : (
              <BellOff size={22} className="text-slate-400" />
            )}
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-white">Notifikasi Email</h3>
              <p className="text-xs text-slate-400">Terima notifikasi melalui email</p>
            </div>
          </div>
          <button
            onClick={() => setNotifikasiEmail(!notifikasiEmail)}
            className={`relative w-12 h-6 rounded-full transition ${
              notifikasiEmail ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
                notifikasiEmail ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Bahasa */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={22} className="text-blue-500" />
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-white">Bahasa</h3>
            <p className="text-xs text-slate-400">Pilih bahasa aplikasi</p>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bahasa"
              value="id"
              checked={bahasa === 'id'}
              onChange={(e) => setBahasa(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-slate-700 dark:text-white text-sm">Bahasa Indonesia</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bahasa"
              value="en"
              checked={bahasa === 'en'}
              onChange={(e) => setBahasa(e.target.value)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-slate-700 dark:text-white text-sm">English</span>
          </label>
        </div>
      </div>

      {/* Ganti Password */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Key size={22} className="text-blue-500" />
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-white">Ganti Password</h3>
            <p className="text-xs text-slate-400">Ubah password akun Anda</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Password Lama"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password Baru"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Konfirmasi Password Baru"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleChangePassword}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition"
          >
            <Lock size={14} /> Ubah Password
          </button>
        </div>
      </div>

      {/* Tombol Simpan Pengaturan */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition"
        >
          <Save size={16} /> Simpan Semua Pengaturan
        </button>
      </div>

      {/* Notifikasi Sukses */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={16} /> Pengaturan berhasil disimpan!
        </div>
      )}
    </div>
  );
}