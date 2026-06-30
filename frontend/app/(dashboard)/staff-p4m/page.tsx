'use client';

import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DashboardStaff() {
  const [dataLaporan, setDataLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterUnit, setFilterUnit] = useState("semua");

  const [chartData, setChartData] = useState([
    { bulan: "Jan", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Feb", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Mar", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Apr", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Mei", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Jun", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Jul", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Agu", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Sep", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Okt", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Nov", total: 0, diproses: 0, selesai: 0 },
    { bulan: "Des", total: 0, diproses: 0, selesai: 0 },
  ]);

  const [statusData, setStatusData] = useState([
    { name: "Diproses", value: 0, color: "#f59e0b" },
    { name: "Review", value: 0, color: "#8b5cf6" },
    { name: "Tindak Lanjut", value: 0, color: "#06b6d4" },
    { name: "Selesai", value: 0, color: "#10b981" },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/laporan');
      const data = await response.json();
      setDataLaporan(data);
      
      const bulanMap: { [key: string]: any } = {};
      data.forEach((item: any) => {
        const bulan = new Date(item.tanggal_submit).toLocaleString('id-ID', { month: 'short' });
        if (!bulanMap[bulan]) {
          bulanMap[bulan] = { total: 0, diproses: 0, selesai: 0 };
        }
        bulanMap[bulan].total++;
        if (item.status === "Close") {
          bulanMap[bulan].selesai++;
        } else if (item.status !== "Diterima" && item.status !== "Close") {
          bulanMap[bulan].diproses++;
        }
      });
      
      const newChartData = chartData.map(item => ({
        ...item,
        total: bulanMap[item.bulan]?.total || 0,
        diproses: bulanMap[item.bulan]?.diproses || 0,
        selesai: bulanMap[item.bulan]?.selesai || 0,
      }));
      setChartData(newChartData);
      
      const diproses = data.filter((d: any) => d.status !== "Close" && d.status !== "Diterima").length;
      const review = data.filter((d: any) => d.status === "Review Ka-P4M").length;
      const tindakLanjut = data.filter((d: any) => d.status === "Tindak Lanjut").length;
      const selesai = data.filter((d: any) => d.status === "Close").length;
      setStatusData([
        { name: "Diproses", value: diproses, color: "#f59e0b" },
        { name: "Review", value: review, color: "#8b5cf6" },
        { name: "Tindak Lanjut", value: tindakLanjut, color: "#06b6d4" },
        { name: "Selesai", value: selesai, color: "#10b981" },
      ]);
      
    } catch (error) {
      console.error('Gagal ambil data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalLaporan = dataLaporan.length;
  const prosesCount = dataLaporan.filter((item) => item.status !== "Close").length;
  const selesaiCount = dataLaporan.filter((item) => item.status === "Close").length;
  const overdueCount = dataLaporan.filter((item) => item.status === "Overdue").length;

  const daftarUnit = ["semua", "Akademik", "BMN dan Pengadaan", "Career Development Center", "Jurusan Elektro", "K3L", "Kehumasan dan Protokoler", "Kemahasiswaan", "Kerjasama", "P4M", "Perencanaan", "Perpustakaan", "Satgas PPKPT", "Shilau", "Sub Bagian Umum", "UPA PP", "UPA TIK"];

  const getWarnaStatus = (status: string) => {
    switch (status) {
      case "Diterima": return "bg-blue-100 text-blue-700";
      case "Distribusi": return "bg-purple-100 text-purple-700";
      case "Diproses": return "bg-yellow-100 text-yellow-700";
      case "Review Ka-P4M": return "bg-indigo-100 text-indigo-700";
      case "Tindak Lanjut": return "bg-cyan-100 text-cyan-700";
      case "Close": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CARD STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-blue-100 text-sm">Total Laporan</p><p className="text-3xl font-bold mt-2">{totalLaporan}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><FileText size={24} /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-yellow-100 text-sm">Diproses</p><p className="text-3xl font-bold mt-2">{prosesCount}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-green-100 text-sm">Selesai</p><p className="text-3xl font-bold mt-2">{selesaiCount}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><CheckCircle2 size={24} /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-red-100 text-sm">Overdue</p><p className="text-3xl font-bold mt-2">{overdueCount}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
          </div>
        </div>
      </div>

      {/* GRAFIK 1: Line Chart */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl shadow-md p-5 border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" /> Tren Laporan Masuk
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="diproses" stroke="#f59e0b" name="Diproses" strokeWidth={2} />
              <Line type="monotone" dataKey="selesai" stroke="#10b981" name="Selesai" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAFIK 2: Pie & Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl shadow-md p-5 border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" /> Status Laporan
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

        <div className="bg-white rounded-2xl shadow-md p-5 border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" /> Laporan Per Bulan
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

      {/* FILTER */}
      <div className="mt-6 flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs">Excel</button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs">PDF</button>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm">
              <option value="semua">Semua Status</option>
              <option value="Distribusi">Distribusi</option>
              <option value="Diproses">Diproses</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="bg-transparent text-sm">
              {daftarUnit.map((u) => (<option key={u} value={u}>{u === "semua" ? "Semua Unit" : u}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* TABEL LAPORAN */}
      <div className="mt-4 overflow-x-auto">
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-center text-sm">No</th>
                <th className="px-4 py-3 text-left text-sm">Uraian</th>
                <th className="px-4 py-3 text-left text-sm">Penyebab</th>
                <th className="px-4 py-3 text-left text-sm">RTL</th>
                <th className="px-4 py-3 text-center text-sm">Status</th>
                <th className="px-4 py-3 text-left text-sm">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {dataLaporan.slice(0, 5).map((item, idx) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-3 text-center text-sm">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm">{item.isi_laporan?.substring(0, 50)}...</td>
                  <td className="px-4 py-3 text-sm">{item.penyebab || "-"}</td>
                  <td className="px-4 py-3 text-sm">{item.rencana_tindak_lanjut || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getWarnaStatus(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.hasil_tindak_lanjut || "-"}</td>
                </tr>
              ))}
              {dataLaporan.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Belum ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}