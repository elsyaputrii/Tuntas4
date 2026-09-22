'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Mail, Building, Calendar, Edit, Save, X, Camera } from 'lucide-react';

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

const emptyProfile: UserProfile = {
  id: 0,
  nama_lengkap: '',
  email: '',
  role: 'staf_p4m',
  unit: 'P4M',
  username: '',
  created_at: '',
  foto_profil: null,
  tanggal_bergabung: null,
};

export default function ProfilStaffPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [editForm, setEditForm] = useState<UserProfile>(emptyProfile);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'staf_p4m') {
      router.replace('/staff-p4m/login');
      return;
    }
    setIsChecking(false);
  }, [router]);

  // Ambil data profil dari backend (bukan localStorage lagi, biar selalu
  // sinkron dan tanggal_bergabung yang barusan diedit ikut ke-load ulang)
  useEffect(() => {
    if (isChecking) return;
    fetchUserData();
  }, [isChecking]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm(data);
      }
    } catch (error) {
      console.error('Gagal ambil data user:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: sekarang benar-benar PUT ke /api/users/profile (dulu cuma
  // setState + localStorage, jadi perubahan hilang lagi kalau refresh /
  // login ulang, dan tanggal_bergabung sama sekali gak bisa diedit).
  // Validasi "tidak boleh tanggal masa depan" dicek di sini (atribut
  // `max` pada <input type="date">) DAN di backend (updateProfile,
  // userController.js) — jadi tetap aman walau input di-bypass dari luar.
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

        // Sinkronkan nama/email di localStorage biar navbar dll ikut update
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          user.name = updated.nama_lengkap;
          user.email = updated.email;
          localStorage.setItem('user', JSON.stringify(user));
        } catch {}

        alert('✅ Profil berhasil diperbarui!');
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.message || 'Gagal menyimpan perubahan. Pastikan tanggal bergabung tidak melebihi hari ini.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">👤 Profil Saya</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
          >
            <Edit size={18} /> Edit Profil
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition disabled:opacity-50"
            >
              <X size={16} /> Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-full bg-linear-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold mx-auto overflow-hidden relative">
            {avatar ? (
              // Preview lokal dari URL.createObjectURL(file) — bukan URL remote, next/image gak bisa optimasi ini
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : profile.foto_profil ? (
              <Image
                src={`${BASE_URL}/uploads/${profile.foto_profil}`}
                alt="Avatar"
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <span>{profile.nama_lengkap?.charAt(0) || 'A'}</span>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-600 transition">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mt-2">{profile.nama_lengkap}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Staff P4M</p>
      </div>

      {/* Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 space-y-4">
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <User size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Nama Lengkap</p>
            {isEditing ? (
              <input
                type="text"
                value={editForm.nama_lengkap}
                onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
                className="w-full bg-transparent border-b border-blue-400 focus:outline-none dark:text-white"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{profile.nama_lengkap}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Mail size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Email</p>
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-transparent border-b border-blue-400 focus:outline-none dark:text-white"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{profile.email}</p>
            )}
          </div>
        </div>

        {/* Unit: readonly — sumbernya dari role akun, backend gak nerima
            perubahan unit lewat endpoint update profil sendiri */}
        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Building size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Unit</p>
            <p className="text-gray-700 dark:text-gray-300">{profile.unit || '-'}</p>
          </div>
        </div>

        {/* Bergabung Sejak — bisa diedit tanggal/bulan/tahun-nya, tapi
            `max` mengunci input supaya gak bisa pilih tanggal yang belum
            terjadi (hari ini adalah batas paling akhir yang boleh dipilih);
            backend (updateProfile) menolak juga kalau tetap dipaksa lewat request langsung */}
        <div className="flex items-center gap-4 p-3">
          <Calendar size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Bergabung Sejak</p>
            {!isEditing ? (
              <p className="text-gray-700 dark:text-gray-300">
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
                className="bg-transparent border-b border-blue-400 outline-none dark:text-white"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}