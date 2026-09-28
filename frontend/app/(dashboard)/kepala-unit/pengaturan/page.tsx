'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Bell,
  BellOff,
  Key,
  Save,
  CheckCircle,
  Lock,
} from 'lucide-react';


const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const MAX_PASSWORD_LENGTH = 12;
const PASSWORD_MAX_MESSAGE =
  'Password boleh kurang dari 12 karakter, tapi tidak boleh lebih dari 12 karakter.';

export default function PengaturanKaP4MPage() {
  const router = useRouter();
  const [isAuthorized] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) return false;
    try {
      const user = JSON.parse(userRaw);
      return user.role === 'kepala_unit';
    } catch {
      return false;
    }
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth check — redirect kalau belum login/role salah
  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/kepala-unit/login');
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

    alert('✅ Pengaturan berhasil disimpan!');
  };

  const handleChangePassword = async () => {
    setPwMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: 'error', text: 'Harap isi semua field password.' });
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setPwMessage({ type: 'error', text: PASSWORD_MAX_MESSAGE });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok.' });
      return;
    }

    setPwLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json().catch(() => null);
      console.log('change-password:', response.status, data);

      if (response.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPwMessage({
          type: 'success',
          text: 'Password berhasil diubah. Anda akan dialihkan ke halaman login...',
        });

        // Password berubah → paksa logout & balik ke halaman login.
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('user');
          router.replace('/kepala-unit/login');
        }, 1500);
      } else {
        setPwMessage({
          type: 'error',
          text: `${data?.message || 'Gagal mengubah password.'} (kode ${response.status})`,
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPwMessage({
        type: 'error',
        text: `Tidak bisa terhubung ke server (${BASE_URL}). Pastikan backend sedang berjalan.`,
      });
    } finally {
      setPwLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-100 flex items-center justify-center">
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
          {newPassword.length > MAX_PASSWORD_LENGTH && (
            <p className="text-xs text-red-600 -mt-1 px-1">{PASSWORD_MAX_MESSAGE}</p>
          )}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Konfirmasi Password Baru"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleChangePassword}
            disabled={pwLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm transition"
          >
            <Lock size={14} /> {pwLoading ? 'Menyimpan...' : 'Ubah Password'}
          </button>

          {pwMessage && (
            <p
              className={`text-sm rounded-xl px-4 py-2 ${
                pwMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {pwMessage.text}
            </p>
          )}
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