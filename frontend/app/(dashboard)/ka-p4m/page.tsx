'use client';

import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Eye,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DashboardKaP4MPage() {
  const [dataLaporan, setDataLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Data untuk grafik
  const [chartData, setChartData] = useState([
    { bulan: "Jan", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Feb", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Mar", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Apr", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Mei", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Jun", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Jul", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Agu", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Sep", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Okt", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Nov", total: 0, disetujui: 0, ditolak: 0 },
    { bulan: "Des", total: 0, disetujui: 0, ditolak: 0 },
  ]);

  const [statusData, setStatusData] = useState([
    { name: "Disetujui", value: 0, color: "#10b981" },
    { name: "Ditolak", value: 0, color: "#ef4444" },
    { name: "Menunggu", value: 0, color: "#f59e0b" },
  ]);

  // Ambil data dari backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/laporan');
        const data = await response.json();
        setDataLaporan(data);

        // Proses data untuk chart per bulan
        const bulanMap: { [key: string]: any } = {};
        data.forEach((item: any) => {
          const bulan = new Date(item.tanggal_submit).toLocaleString('id-ID', { month: 'short' });
          if (!bulanMap[bulan]) {
            bulanMap[bulan] = { total: 0, disetujui: 0, ditolak: 0 };
          }
          bulanMap[bulan].total++;
          if (item.status === "Tindak Lanjut") {
            bulanMap[bulan].disetujui++;
          } else if (item.status === "Revisi") {
            bulanMap[bulan].ditolak++;
          }
        });

        const newChartData = chartData.map(item => ({
          ...item,
          total: bulanMap[item.bulan]?.total || 0,
          disetujui: bulanMap[item.bulan]?.disetujui || 0,
          ditolak: bulanMap[item.bulan]?.ditolak || 0,
        }));
        setChartData(newChartData);

        // Update status pie chart
        const disetujui = data.filter((d: any) => d.status === "Tindak Lanjut").length;
        const ditolak = data.filter((d: any) => d.status === "Revisi").length;
        const menunggu = data.filter((d: any) => d.status === "Review Ka-P4M").length;
        setStatusData([
          { name: "Disetujui", value: disetujui, color: "#10b981" },
          { name: "Ditolak", value: ditolak, color: "#ef4444" },
          { name: "Menunggu", value: menunggu, color: "#f59e0b" },
        ]);

      } catch (error) {
        console.error('Gagal ambil data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = {
    total: dataLaporan.length,
    disetujui: dataLaporan.filter((item) => item.status === "Tindak Lanjut").length,
    ditolak: dataLaporan.filter((item) => item.status === "Revisi").length,
    menunggu: dataLaporan.filter((item) => item.status === "Review Ka-P4M").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat data usulan...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ========== CARD STATISTIK ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Total Usulan</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><FileText size={24} /></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Disetujui</p>
              <p className="text-3xl font-bold mt-2">{stats.disetujui}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><CheckCircle2 size={24} /></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-100 text-sm">Ditolak / Revisi</p>
              <p className="text-3xl font-bold mt-2">{stats.ditolak}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><AlertCircle size={24} /></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm">Menunggu Review</p>
              <p className="text-3xl font-bold mt-2">{stats.menunggu}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
          </div>
        </div>
      </div>

      {/* ========== GRAFIK 1: LINE CHART ========== */}
      <div className="mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Tren Usulan Masuk
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total Usulan" strokeWidth={2} />
              <Line type="monotone" dataKey="disetujui" stroke="#10b981" name="Disetujui" strokeWidth={2} />
              <Line type="monotone" dataKey="ditolak" stroke="#ef4444" name="Ditolak" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========== GRAFIK 2: PIE CHART + BAR CHART ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            <Eye size={18} className="text-green-500" />
            Status Usulan
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" />
            Usulan Per Bulan
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="disetujui" fill="#10b981" name="Disetujui" />
              <Bar dataKey="ditolak" fill="#ef4444" name="Ditolak" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========== PESAN KOSONG ========== */}
      <div className="mt-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText size={32} className="text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
            Belum Ada Usulan
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Usulan dari Kepala Unit akan muncul di halaman Proses Pengaduan.
            Silakan review dan tentukan tindakan.
          </p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs text-slate-500">
              ✅ Setujui
            </div>
            <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs text-slate-500">
              ❌ Tidak Setujui
            </div>
            <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs text-slate-500">
              📝 Beri Alasan
            </div>
          </div>
        </div>
      </div>
    </>
  );
}