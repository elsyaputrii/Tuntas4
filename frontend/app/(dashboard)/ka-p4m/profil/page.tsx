'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Building, Calendar, Edit, Save, X, Camera, Phone } from 'lucide-react';

export default function ProfilKaP4MPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Kepala P4M',
    email: 'kap4m@polibatam.ac.id',
    role: 'Kepala P4M',
    unit: 'P4M',
    username: 'kap4m',
    phone: '08123456789',
    joined: '2024-01-01',
  });
  const [editForm, setEditForm] = useState(profile);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'ka_p4m') {
      router.replace('/ka-p4m/login');
      return;
    }
    // Ambil data user dari localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.name) {
        setProfile({
          name: user.name || 'Kepala P4M',
          email: user.email || 'kap4m@polibatam.ac.id',
          role: 'Kepala P4M',
          unit: user.unit || 'P4M',
          username: user.username || 'kap4m',
          phone: user.phone || '08123456789',
          joined: user.created_at || '2024-01-01',
        });
        setEditForm({
          name: user.name || 'Kepala P4M',
          email: user.email || 'kap4m@polibatam.ac.id',
          role: 'Kepala P4M',
          unit: user.unit || 'P4M',
          username: user.username || 'kap4m',
          phone: user.phone || '08123456789',
          joined: user.created_at || '2024-01-01',
        });
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
    setIsChecking(false);
  }, [router]);

  const handleSave = () => {
    setProfile(editForm);
    setIsEditing(false);
    // Simpan ke localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.name = editForm.name;
      user.email = editForm.email;
      user.phone = editForm.phone;
      user.unit = editForm.unit;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {}
    alert('✅ Profil berhasil diperbarui!');
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

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">👤 Profil Saya - Ka-P4M</h2>
        <button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
        >
          {isEditing ? <Save size={18} /> : <Edit size={18} />}
          {isEditing ? 'Simpan' : 'Edit Profil'}
        </button>
      </div>

      {/* Avatar */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold mx-auto overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{profile.name?.charAt(0) || 'K'}</span>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-600 transition">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mt-2">{profile.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{profile.role}</p>
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
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-transparent border-b border-blue-400 focus:outline-none dark:text-white"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{profile.name}</p>
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

        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Phone size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Telepon</p>
            {isEditing ? (
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full bg-transparent border-b border-blue-400 focus:outline-none dark:text-white"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{profile.phone}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 border-b dark:border-slate-700">
          <Building size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Unit</p>
            {isEditing ? (
              <input
                type="text"
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="w-full bg-transparent border-b border-blue-400 focus:outline-none dark:text-white"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">{profile.unit}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-3">
          <Calendar size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Bergabung Sejak</p>
            <p className="text-gray-700 dark:text-gray-300">{profile.joined}</p>
          </div>
        </div>
      </div>

      {/* Tombol aksi */}
      {isEditing && (
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition">
            <X size={16} /> Batal
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition">
            <Save size={16} /> Simpan
          </button>
        </div>
      )}
    </div>
  );
}