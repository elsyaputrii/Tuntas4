'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface UserProfile {
  id: number;
  nama_lengkap: string;
  email: string;
  role: string;
  unit: string;
  username: string;
  created_at: string;
}

export default function ProfilKaP4MPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(() => {
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
  });
  const [editForm, setEditForm] = useState(profile);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Auth check — redirect kalau belum login/role salah
  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/kepala-unit/login');
    }
  }, [isAuthorized, router]);

  // Ambil data user
  useEffect(() => {
    if (!isAuthorized) return;
    fetchUserData();
  }, [isAuthorized]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
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
      const response = await fetch(`http://localhost:5000/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nama_lengkap: editForm.nama_lengkap,
          email: editForm.email,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setEditForm(updated);
        setIsEditing(false);
        alert('✅ Profil berhasil diperbarui!');
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  if (!isAuthorized || loading) {
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
          <div className="w-28 h-28 rounded-full bg-linear-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-3 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{profile.nama_lengkap?.charAt(0) || '👤'}</span>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-600 transition">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
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

        {/* Join Date */}
        <div className="flex items-center gap-4 p-3">
          <Calendar size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Bergabung Sejak</p>
            <p className="text-slate-700 dark:text-white">
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('id-ID')
                : '-'}
            </p>
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