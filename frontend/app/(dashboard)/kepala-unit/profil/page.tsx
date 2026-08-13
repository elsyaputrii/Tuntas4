'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  Mail,
  Building,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface UserProfile {
  id: number;
  nama_lengkap: string;
  email: string;
  role: string;
  unit: string;
  username: string;
  created_at: string;
  foto_profil: string | null;
  tanggal_bergabung: string | null;
}

export default function ProfilKaP4MPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    id: 0,
    nama_lengkap: '',
    email: '',
    role: '',
    unit: '',
    username: '',
    created_at: '',
    foto_profil: null,
    tanggal_bergabung: null,
  });
  const [editForm, setEditForm] = useState(profile);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
      router.replace('/kepala-unit/login');
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      if (user.role !== 'kepala_unit') {
        router.replace('/kepala-unit/login');
        return;
      }
    } catch {
      router.replace('/kepala-unit/login');
      return;
    }
    setIsChecking(false);
  }, [router]);

  // Ambil data user
  useEffect(() => {
    if (isChecking) return;
    fetchUserData();
  }, [isChecking]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm(data);
      } else {
        // Data dummy (kalau API belum siap)
        const dummy = {
          id: 1,
          nama_lengkap: 'Kepala Unit',
          email: 'kepala.unit@polibatam.ac.id',
          role: 'kepala_unit',
          unit: '-',
          username: 'kepala_unit',
          created_at: '2024-01-01',
          foto_profil: null,
          tanggal_bergabung: '2024-01-01',
        };
        setProfile(dummy);
        setEditForm(dummy);
      }
    } catch (error) {
      console.error('Gagal ambil data user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_lengkap: editForm.nama_lengkap,
          email: editForm.email,
          tanggal_bergabung: editForm.tanggal_bergabung,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setEditForm(updated);
        setIsEditing(false);
        alert('✅ Profil berhasil diperbarui! Silakan login kembali.');

        // Data akun berubah (nama/email) → sesi lama nggak valid lagi
        // secara logika, jadi paksa logout & balik ke halaman login.
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        router.replace('/kepala-unit/login');
      } else {
        alert('Gagal menyimpan perubahan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal menyimpan perubahan');
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('⚠️ Format foto harus PNG, JPG, atau WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ Ukuran foto maksimal 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('foto', file);

      const response = await fetch(`${BASE_URL}/api/users/profile/foto`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setProfile((prev) => ({ ...prev, foto_profil: data.foto_profil }));
        setEditForm((prev) => ({ ...prev, foto_profil: data.foto_profil }));
        setAvatarVersion((v) => v + 1);
      } else {
        alert(data?.message || 'Gagal mengunggah foto profil.');
      }
    } catch (error) {
      console.error('Error upload foto profil:', error);
      alert('Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header Avatar */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-full bg-linear-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-3 overflow-hidden relative">
            {uploadingAvatar ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : profile.foto_profil ? (
              <Image
                src={`${BASE_URL}/uploads/${profile.foto_profil}?v=${avatarVersion}`}
                alt="Foto profil"
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <span className="text-4xl">{profile.nama_lengkap?.charAt(0) || '👤'}</span>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-600 transition">
              <Camera size={14} />
              <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
            </label>
          )}
        </div>
        {!isEditing ? (
          <>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-white mt-2">
              {profile.nama_lengkap}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 capitalize">
              {profile.role?.replace('_', ' ')}
            </p>
          </>
        ) : (
          <div className="mt-2">
            <input
              type="text"
              value={editForm.nama_lengkap}
              onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
              className="text-center text-2xl font-bold bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {/* Info Detail */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
          <User size={18} /> Informasi Akun
        </h3>

        {/* Username (readonly) */}
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <User size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Username</p>
            <p className="text-slate-700 dark:text-white">{profile.username}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Mail size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Email</p>
            {!isEditing ? (
              <p className="text-slate-700 dark:text-white">{profile.email}</p>
            ) : (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </div>
        </div>

        {/* Role (readonly) */}
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Building size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Role</p>
            <p className="text-slate-700 dark:text-white capitalize">
              {profile.role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Unit (readonly) */}
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Building size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Unit</p>
            <p className="text-slate-700 dark:text-white">{profile.unit || '-'}</p>
          </div>
        </div>

        {/* Bergabung Sejak (bisa diedit: tahun, bulan, tanggal) */}
        <div className="flex items-center gap-4 p-3">
          <Calendar size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Bergabung Sejak</p>
            {!isEditing ? (
              <p className="text-slate-700 dark:text-white">
                {profile.tanggal_bergabung
                  ? new Date(profile.tanggal_bergabung).toLocaleDateString('id-ID')
                  : '-'}
              </p>
            ) : (
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={
                  editForm.tanggal_bergabung
                    ? new Date(editForm.tanggal_bergabung).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => setEditForm({ ...editForm, tanggal_bergabung: e.target.value })}
                className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </div>
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="flex justify-end gap-3 mt-6">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
          >
            <Edit size={16} /> Edit Profil
          </button>
        ) : (
          <>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
            >
              <X size={16} /> Batal
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition"
            >
              <Save size={16} /> Simpan
            </button>
          </>
        )}
      </div>
    </div>
  );
}