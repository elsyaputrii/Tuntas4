'use client';

import React, { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  Search,
  UserPlus,
  UserCheck,
  Users,
  Mail,
  Phone,
  Crown,
  Briefcase,
  UserCog,
  X,
  PenTool,
  Upload,
  Trash,
} from "lucide-react";
import { userApi } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

interface User {
  id: number;
  name: string;
  email: string;
  role: "staff_p4m" | "kepala_unit" | "ka_p4m";
  nip: string;
  phone: string;
  unit: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
  password?: string;
  tandaTangan?: string | null;
}

export default function DataAkunPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    email: "",
    role: "staff_p4m",
    nip: "",
    phone: "",
    unit: "",
    status: "active",
    password: "",
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Fetch data dari backend
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Gagal ambil data:', error);
      setError('Gagal memuat data akun. Pastikan backend berjalan dan kamu login sebagai Staf P4M.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nip.includes(searchTerm);
    const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser && !formData.password) {
      alert("Password wajib diisi untuk akun baru!");
      return;
    }

    try {
      if (selectedUser) {
        await userApi.updateUser(selectedUser.id, formData);
      } else {
        await userApi.createUser(formData);
      }
      fetchUsers(); // Refresh data
      closeModal();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Gagal menyimpan data: ${error.message || 'Silakan coba lagi'}`);
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      try {
        await userApi.deleteUser(selectedUser.id);
        setUsers(users.filter((user) => user.id !== selectedUser.id));
      } catch (error) {
        console.error("Error:", error);
        alert("Gagal menghapus akun. Silakan coba lagi.");
      }
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...user, password: "" });
    setSignatureFile(null);
    setSignaturePreview(user.tandaTangan ? `${BASE_URL}/uploads/${user.tandaTangan}` : null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({
      name: "",
      email: "",
      role: "staff_p4m",
      nip: "",
      phone: "",
      unit: "",
      status: "active",
      password: "",
    });
    setSignatureFile(null);
    setSignaturePreview(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSignatureFile(null);
    setSignaturePreview(null);
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipeDiizinkan = ["image/jpeg", "image/png", "image/webp"];
    if (!tipeDiizinkan.includes(file.type)) {
      alert("Format tidak didukung. Gunakan PNG, JPG, atau WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2MB.");
      return;
    }
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const handleUploadSignature = async () => {
    if (!selectedUser || !signatureFile) return;
    setUploadingSignature(true);
    try {
      const res = await userApi.uploadTandaTangan(selectedUser.id, signatureFile);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, tandaTangan: res.tandaTangan } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, tandaTangan: res.tandaTangan } : prev));
      setSignatureFile(null);
      alert("Tanda tangan berhasil diunggah.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error uploadTandaTangan:", error);
      alert(`Gagal mengunggah tanda tangan: ${error.message || "Silakan coba lagi"}`);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!selectedUser) return;
    const ok = confirm("Hapus tanda tangan akun ini?");
    if (!ok) return;
    try {
      await userApi.deleteTandaTangan(selectedUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, tandaTangan: null } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, tandaTangan: null } : prev));
      setSignaturePreview(null);
      setSignatureFile(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error deleteTandaTangan:", error);
      alert(`Gagal menghapus tanda tangan: ${error.message || "Silakan coba lagi"}`);
    }
  };

  const stats = {
    total: users.length,
    staffP4M: users.filter((u) => u.role === "staff_p4m").length,
    kepalaUnit: users.filter((u) => u.role === "kepala_unit").length,
    kaP4M: users.filter((u) => u.role === "ka_p4m").length,
    active: users.filter((u) => u.status === "active").length,
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "staff_p4m":
        return <Briefcase size={16} />;
      case "kepala_unit":
        return <UserCog size={16} />;
      case "ka_p4m":
        return <Crown size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "staff_p4m":
        return "Staff P4M";
      case "kepala_unit":
        return "Kepala Unit";
      case "ka_p4m":
        return "KA-P4M";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat data akun...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center p-6 bg-red-50 rounded-xl max-w-md">
          <p className="text-red-600 font-semibold mb-2">⚠️ {error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-700 dark:text-white mb-2">
            Kelola Akun Pengguna
          </h2>
          <p className="text-slate-400 dark:text-slate-400">
            Kelola akun untuk Staff P4M, Kepala Unit, dan KA-P4M yang mengakses sistem
          </p>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-r from-slate-400 to-slate-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition"
               onClick={() => setSelectedRoleFilter("all")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-100 text-sm">Seluruh Akun</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Users size={32} className="text-slate-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition"
               onClick={() => setSelectedRoleFilter("staff_p4m")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-sm">Staff P4M</p>
                <p className="text-3xl font-bold">{stats.staffP4M}</p>
              </div>
              <Briefcase size={32} className="text-emerald-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-violet-400 to-violet-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition"
               onClick={() => setSelectedRoleFilter("kepala_unit")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-violet-100 text-sm">Kepala Unit</p>
                <p className="text-3xl font-bold">{stats.kepalaUnit}</p>
              </div>
              <UserCog size={32} className="text-violet-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition"
               onClick={() => setSelectedRoleFilter("ka_p4m")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-sm">KA-P4M</p>
                <p className="text-3xl font-bold">{stats.kaP4M}</p>
              </div>
              <Crown size={32} className="text-amber-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-cyan-100 text-sm">Aktif</p>
                <p className="text-3xl font-bold">{stats.active}</p>
              </div>
              <UserCheck size={32} className="text-cyan-200" />
            </div>
          </div>
        </div>

        {/* Filter dan Search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="Cari nama, email, atau NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all shadow-sm"
          >
            <UserPlus size={18} />
            Tambah Akun
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Nama / Kontak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  NIP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-300 to-blue-400 flex items-center justify-center text-white font-semibold shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 dark:text-white flex items-center gap-1.5">
                          {user.name}
                          {user.tandaTangan && (
                            <span title="Sudah punya tanda tangan digital" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 text-blue-500">
                              <PenTool size={10} />
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Mail size={12} className="text-slate-300" /> {user.email}
                        </p>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Phone size={12} className="text-slate-300" /> {user.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-medium ${
                      user.role === "staff_p4m" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      user.role === "kepala_unit" ? "bg-violet-50 text-violet-600 border border-violet-100" :
                      "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{user.nip}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{user.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      user.status === "active" 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {user.status === "active" ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{user.lastLogin}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditModal(user)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }} 
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-slate-400">Tidak ada data akun yang ditemukan</div>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedUser ? 'bg-blue-50 text-blue-400' : 'bg-emerald-50 text-emerald-400'}`}>
                  {selectedUser ? <Edit size={20} /> : <UserPlus size={20} />}
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
                  {selectedUser ? 'Edit Akun' : 'Tambah Akun Baru'}
                </h3>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Nama Lengkap <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan alamat email"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role || "staff_p4m"}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="staff_p4m">Staff P4M</option>
                    <option value="kepala_unit">Kepala Unit</option>
                    <option value="ka_p4m">KA-P4M</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status || "active"}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    NIP <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="nip"
                    value={formData.nip || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan NIP"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Nomor Telepon <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan nomor telepon"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Unit <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan unit kerja"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Password {!selectedUser && <span className="text-rose-400">*</span>}
                    {selectedUser && <span className="text-sm text-slate-400 ml-2">(Kosongkan jika tidak diubah)</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleInputChange}
                    required={!selectedUser}
                    placeholder={selectedUser ? "Masukkan password baru (opsional)" : "Masukkan password"}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Tanda Tangan (TTD) Digital — hanya untuk akun yang sudah tersimpan */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  <PenTool size={16} className="text-slate-400" />
                  Tanda Tangan (TTD) Digital
                </label>

                {!selectedUser ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-3">
                    Simpan akun baru ini terlebih dahulu, lalu buka menu Edit untuk mengunggah tanda tangan.
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                    <div className="w-32 h-20 shrink-0 border border-slate-200 dark:border-slate-600 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      {signaturePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signaturePreview} alt="Pratinjau tanda tangan" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-300 italic px-2 text-center">Belum ada tanda tangan</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-400">
                        Gambar tanda tangan ini akan otomatis ditempel pada dokumen PDF yang dicetak sistem
                        (mis. PDF Rekapitulasi), seperti tanda tangan digital pada dokumen bank. Format PNG/JPG/WEBP, maks. 2MB — gunakan gambar dengan latar transparan/putih untuk hasil terbaik.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <Upload size={14} />
                          Pilih Gambar
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSignatureChange} />
                        </label>
                        <button
                          type="button"
                          onClick={handleUploadSignature}
                          disabled={!signatureFile || uploadingSignature}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500 disabled:bg-blue-200 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          {uploadingSignature ? "Mengunggah..." : "Unggah"}
                        </button>
                        {selectedUser.tandaTangan && (
                          <button
                            type="button"
                            onClick={handleDeleteSignature}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors"
                          >
                            <Trash size={14} />
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 transition-colors shadow-sm flex items-center gap-2"
                >
                  {selectedUser ? <Edit size={18} /> : <UserPlus size={18} />}
                  {selectedUser ? 'Simpan Perubahan' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-full">
                  <Trash2 size={32} className="text-rose-400 dark:text-rose-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center text-slate-700 dark:text-white mb-2">
                Konfirmasi Hapus Akun
              </h3>
              <p className="text-center text-slate-400 dark:text-slate-400 mb-6">
                Apakah Anda yakin ingin menghapus akun <br />
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {selectedUser.name}
                </span>?
                <br />
                <span className="text-sm text-rose-400">Tindakan ini tidak dapat dibatalkan!</span>
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-lg hover:from-rose-500 hover:to-rose-600 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Hapus Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}