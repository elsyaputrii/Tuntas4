'use client';

import React, { useState, useEffect } from "react";
import { FileText, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
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
import { kepalaUnitApi } from "@/lib/api";

// ✅ Definisikan tipe data
interface LaporanItem {
  id: string;
  id_boxing?: string;
  isi_laporan?: string;
  status: string;
  tanggal_submit: string;
  created_at?: string;
  tanggal_laporan?: string;
  approval_staf?: string;
  id_pelaksanaan?: string | null;
}

interface BulanData {
  total: number;
  selesai: number;
}

interface ChartDataItem {
  bulan: string;
  total: number;
  selesai: number;
}

interface StatusDataItem {
  name: string;
  value: number;
  color: string;
}

export default function DashboardKepalaUnitPage() {
  const [dataLaporan, setDataLaporan] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitSaya, setUnitSaya] = useState('');

  const [chartData, setChartData] = useState<ChartDataItem[]>([
    { bulan: "Jan", total: 0, selesai: 0 },
    { bulan: "Feb", total: 0, selesai: 0 },
    { bulan: "Mar", total: 0, selesai: 0 },
    { bulan: "Apr", total: 0, selesai: 0 },
    { bulan: "Mei", total: 0, selesai: 0 },
    { bulan: "Jun", total: 0, selesai: 0 },
    { bulan: "Jul", total: 0, selesai: 0 },
    { bulan: "Agu", total: 0, selesai: 0 },
    { bulan: "Sep", total: 0, selesai: 0 },
    { bulan: "Okt", total: 0, selesai: 0 },
    { bulan: "Nov", total: 0, selesai: 0 },
    { bulan: "Des", total: 0, selesai: 0 },
  ]);

  const [statusData, setStatusData] = useState<StatusDataItem[]>([
    { name: "Diproses", value: 0, color: "#f59e0b" },
    { name: "Review", value: 0, color: "#8b5cf6" },
    { name: "Tindak Lanjut", value: 0, color: "#06b6d4" },
    { name: "Selesai", value: 0, color: "#10b981" },
  ]);

  useEffect(() => {
    // Ambil unit dari localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUnitSaya(user.unit || '');
    } catch (e) {
      console.error('Gagal ambil unit:', e);
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Gabungkan laporan yang masih butuh aksi (masuk) + yang sudah ada hasilnya,
        // karena gak ada satu endpoint yang nampung semua laporan unit sekaligus.
        const [masuk, hasil] = await Promise.all([
          kepalaUnitApi.getLaporanMasuk(),  // { success, data: [...] } — butuh rancangan/revisi
          kepalaUnitApi.getLaporanHasil(),  // { success, data: [...] } — sudah ditindaklanjuti/menunggu approval
        ]);

        const mapStatusMasuk = (row: LaporanItem) =>
          row.approval_staf === "ditolak" ? "Diterima" : "Review Ka-P4M";
        
        const mapStatusHasil = (row: LaporanItem) => {
          if (row.id_pelaksanaan) return "Tindak Lanjut";
          return "Diproses";
        };

        const dataMasuk: LaporanItem[] = (masuk.data || []).map((row: LaporanItem) => ({
          ...row,
          id: `masuk-${row.id_boxing}`,
          status: mapStatusMasuk(row),
          tanggal_submit: row.created_at || new Date().toISOString(),
        }));

        const dataHasil: LaporanItem[] = (hasil.data || []).map((row: LaporanItem) => ({
          ...row,
          id: `hasil-${row.id_boxing}`,
          status: mapStatusHasil(row),
          tanggal_submit: row.tanggal_laporan || new Date().toISOString(),
        }));

        const data = [...dataMasuk, ...dataHasil];
        setDataLaporan(data);

        // Buat map untuk data bulan
        const bulanMap: Record<string, BulanData> = {};
        const bulanNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        
        // Inisialisasi semua bulan dengan 0
        bulanNames.forEach(bulan => {
          bulanMap[bulan] = { total: 0, selesai: 0 };
        });

        // Isi data dari laporan
        data.forEach((item: LaporanItem) => {
          const bulan = new Date(item.tanggal_submit).toLocaleString('id-ID', { month: 'short' });
          if (bulanMap[bulan]) {
            bulanMap[bulan].total++;
            if (item.status === "Close") {
              bulanMap[bulan].selesai++;
            }
          }
        });

        // Update chart data
        const newChartData = bulanNames.map(bulan => ({
          bulan,
          total: bulanMap[bulan]?.total || 0,
          selesai: bulanMap[bulan]?.selesai || 0,
        }));
        setChartData(newChartData);

        // Update status data
        const diproses = data.filter((d: LaporanItem) => d.status !== "Close" && d.status !== "Diterima").length;
        const review = data.filter((d: LaporanItem) => d.status === "Review Ka-P4M").length;
        const tindakLanjut = data.filter((d: LaporanItem) => d.status === "Tindak Lanjut").length;
        const selesai = data.filter((d: LaporanItem) => d.status === "Close").length;

        setStatusData([
          { name: "Diproses", value: diproses, color: "#f59e0b" },
          { name: "Review", value: review, color: "#8b5cf6" },
          { name: "Tindak Lanjut", value: tindakLanjut, color: "#06b6d4" },
          { name: "Selesai", value: selesai, color: "#10b981" },
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = {
    total: dataLaporan.length,
    diproses: dataLaporan.filter((i) => i.status !== "Close").length,
    selesai: dataLaporan.filter((i) => i.status === "Close").length,
    overdue: dataLaporan.filter((i) => i.status === "Overdue").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-125">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat data laporan unit...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ========== CARD STATISTIK ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Total Laporan</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><FileText size={24} /></div>
          </div>
        </div>

        <div className="bg-linear-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-yellow-100 text-sm">Diproses</p>
              <p className="text-3xl font-bold mt-2">{stats.diproses}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
          </div>
        </div>

        <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Selesai</p>
              <p className="text-3xl font-bold mt-2">{stats.selesai}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><CheckCircle2 size={24} /></div>
          </div>
        </div>

        <div className="bg-linear-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-100 text-sm">Overdue</p>
              <p className="text-3xl font-bold mt-2">{stats.overdue}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl"><AlertCircle size={24} /></div>
          </div>
        </div>
      </div>

      {/* ========== GRAFIK 1: LINE CHART ========== */}
      <div className="mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Tren Laporan Unit {unitSaya}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="selesai" stroke="#10b981" name="Selesai" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========== GRAFIK 2: PIE CHART + BAR CHART ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            🥧 Status Laporan
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label
              >
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
            📊 Laporan Per Bulan
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="selesai" fill="#10b981" name="Selesai" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========== TABEL LAPORAN TERBARU ========== */}
      <div className="mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-white">📋 Laporan Terbaru</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Laporan</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {dataLaporan.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      Belum ada laporan
                    </td>
                  </tr>
                ) : (
                  dataLaporan.slice(0, 5).map((item: LaporanItem) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 text-sm text-gray-500">#{item.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.isi_laporan?.substring(0, 50)}...
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Close' ? 'bg-green-100 text-green-700' :
                          item.status === 'Review Ka-P4M' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status || 'Diproses'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {new Date(item.tanggal_submit).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}