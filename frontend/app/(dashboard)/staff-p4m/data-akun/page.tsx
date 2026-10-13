'use client';

import React, { useState, useEffect } from "react";
import { userApi } from "@/lib/api";
import {
  Edit,
  Trash2,
  Search,
  UserPlus,
  UserCheck,
  Users,
  Mail,
  Crown,
  Briefcase,
  UserCog,
  X,
} from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "staff_p4m" | "kepala_unit" | "ka_p4m";
  nip: string;
  unit: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
  password?: string;
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
    unit: "",
    status: "active",
    password: "",
  });

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
      console.error("Gagal ambil data:", error);
      setError("Gagal memuat data akun. Pastikan backend berjalan.");
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
        await userApi.updateUser(selectedUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          nip: formData.nip,
          unit: formData.unit,
          status: formData.status,
          password: formData.password || undefined,
        });
      } else {
        await userApi.createUser({
          name: formData.name || "",
          email: formData.email || "",
          password: formData.password || "",
          role: formData.role || "staff_p4m",
          nip: formData.nip,
          unit: formData.unit,
          status: formData.status,
        });
      }
      fetchUsers();
      closeModal();
    } catch (error) {
      console.error("Error:", error);
      alert(
        `Gagal menyimpan data: ${
          error instanceof Error ? error.message : "Silakan coba lagi"
        }`
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await userApi.deleteUser(selectedUser.id);
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error:", error);
      alert("Gagal menghapus akun. Silakan coba lagi.");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...user, password: "" });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({
      name: "",
      email: "",
      role: "staff_p4m",
      nip: "",
      unit: "",
      status: "active",
      password: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
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
      <div className="flex items-center justify-center h-125">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600">Memuat data akun...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-125">
        <div className="text-center p-6 bg-blue-50 rounded-xl max-w-md border border-blue-200">
          <p className="text-blue-700 font-semibold mb-2">⚠️ {error}</p>
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
      <div className="p-6 bg-blue-50/30 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
            Kelola Akun Pengguna
          </h2>
          <p className="text-blue-500 dark:text-blue-300">
            Kelola akun untuk Staff P4M, Kepala Unit, dan KA-P4M yang mengakses sistem
          </p>
        </div>

        {/* Statistik Cards — 5 variasi biru */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition shadow-blue-200"
            onClick={() => setSelectedRoleFilter("all")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm">Seluruh Akun</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Users size={32} className="text-blue-200" />
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-sky-400 to-sky-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition shadow-sky-200"
            onClick={() => setSelectedRoleFilter("staff_p4m")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sky-100 text-sm">Staff P4M</p>
                <p className="text-3xl font-bold">{stats.staffP4M}</p>
              </div>
              <Briefcase size={32} className="text-sky-200" />
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition shadow-indigo-200"
            onClick={() => setSelectedRoleFilter("kepala_unit")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm">Kepala Unit</p>
                <p className="text-3xl font-bold">{stats.kepalaUnit}</p>
              </div>
              <UserCog size={32} className="text-indigo-200" />
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition shadow-blue-300"
            onClick={() => setSelectedRoleFilter("ka_p4m")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-200 text-sm">KA-P4M</p>
                <p className="text-3xl font-bold">{stats.kaP4M}</p>
              </div>
              <Crown size={32} className="text-blue-300" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-xl p-4 text-white shadow-cyan-200">
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
          <div className="flex-1 min-w-50px">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Cari nama, email, atau NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-950 text-blue-800 dark:text-blue-200 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-950 text-blue-800 dark:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <UserPlus size={18} />
            Tambah Akun
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto bg-white dark:bg-blue-950 rounded-xl shadow-md shadow-blue-100 border border-blue-100">
          <table className="w-full">
            <thead className="bg-blue-50 dark:bg-blue-900/50 border-b border-blue-200 dark:border-blue-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Nama / Kontak
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  NIP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 dark:divide-blue-800">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-blue-50/60 dark:hover:bg-blue-900/40 transition duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md shadow-blue-200">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-100">
                          {user.name}
                        </p>
                        <p className="text-sm text-blue-400 flex items-center gap-1">
                          <Mail size={12} className="text-blue-300" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-medium border ${
                        user.role === "staff_p4m"
                          ? "bg-sky-100 text-sky-700 border-sky-200"
                          : user.role === "kepala_unit"
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-300">{user.nip}</td>
                  <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-300">{user.unit}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium border ${
                        user.status === "active"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-sky-100 text-sky-700 border-sky-200"
                      }`}
                    >
                      {user.status === "active" ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-400">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-blue-400">
              Tidak ada data akun yang ditemukan
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-blue-950 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-blue-100">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 border-b border-blue-300 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 text-white">
                  {selectedUser ? <Edit size={20} /> : <UserPlus size={20} />}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedUser ? "Edit Akun" : "Tambah Akun Baru"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Nama Lengkap <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Email <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan alamat email"
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Role <span className="text-blue-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role || "staff_p4m"}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="staff_p4m">Staff P4M</option>
                    <option value="kepala_unit">Kepala Unit</option>
                    <option value="ka_p4m">KA-P4M</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Status <span className="text-blue-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status || "active"}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    NIP <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nip"
                    value={formData.nip || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan NIP"
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Unit <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit || ""}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan unit kerja"
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-2">
                    Password {!selectedUser && <span className="text-blue-500">*</span>}
                    {selectedUser && (
                      <span className="text-sm text-blue-400 ml-2">
                        (Kosongkan jika tidak diubah)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleInputChange}
                    required={!selectedUser}
                    placeholder={
                      selectedUser
                        ? "Masukkan password baru (opsional)"
                        : "Masukkan password"
                    }
                    className="w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-100 dark:border-blue-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                >
                  {selectedUser ? <Edit size={18} /> : <UserPlus size={18} />}
                  {selectedUser ? "Simpan Perubahan" : "Tambah Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-blue-950 rounded-2xl shadow-xl w-full max-w-md border border-blue-100">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Trash2 size={32} className="text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center text-blue-800 dark:text-blue-100 mb-2">
                Konfirmasi Hapus Akun
              </h3>
              <p className="text-center text-blue-500 dark:text-blue-300 mb-6">
                Apakah Anda yakin ingin menghapus akun <br />
                <span className="font-semibold text-blue-700 dark:text-blue-200">
                  {selectedUser.name}
                </span>
                ?
                <br />
                <span className="text-sm text-blue-400">
                  Tindakan ini tidak dapat dibatalkan!
                </span>
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
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