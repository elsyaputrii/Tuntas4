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
import { stafApi } from "@/lib/api";

export default function DashboardStaff() {
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dataLaporan, setDataLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    { name: "Diterima", value: 0, color: "#3b82f6" },
    { name: "Distribusi", value: 0, color: "#8b5cf6" },
    { name: "Diproses", value: 0, color: "#f59e0b" },
    { name: "Review Ka-P4M", value: 0, color: "#6366f1" },
    { name: "Selesai", value: 0, color: "#10b981" },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [masuk, proses] = await Promise.all([
        stafApi.getLaporanMasuk(),
        stafApi.getProsesMonitor(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapStatusProses = (row: any) => {
        if (row.status_boxing === "selesai") return "Close";
        if (row.status_review && row.status_review !== "disetujui" && row.status_review !== "tidak_disetujui") {
          return "Review Ka-P4M";
        }
        if (row.status_boxing === "terdistribusi") return "Distribusi";
        return "Diproses";
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataMasuk = (masuk.data || []).map((row: any) => ({
        id: `l-${row.id_laporan}`,
        isi_laporan: row.deskripsi,
        penyebab: null,
        rencana_tindak_lanjut: null,
        hasil_tindak_lanjut: null,
        status: "Diterima",
        tanggal_submit: row.created_at,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataProses = (proses.data || []).map((row: any) => ({
        id: `b-${row.id_boxing}`,
        isi_laporan: row.isi_laporan,
        penyebab: row.penyebab,
        rencana_tindak_lanjut: row.rencana_tindakan,
        hasil_tindak_lanjut: row.hasil_tindakan,
        status: mapStatusProses(row),
        tanggal_submit: row.created_at,
      }));

      const data = [...dataMasuk, ...dataProses];
      setDataLaporan(data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bulanMap: { [key: string]: any } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diterima = data.filter((d: any) => d.status === "Diterima").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const distribusi = data.filter((d: any) => d.status === "Distribusi").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diproses = data.filter((d: any) => d.status === "Diproses").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const review = data.filter((d: any) => d.status === "Review Ka-P4M").length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selesai = data.filter((d: any) => d.status === "Close").length;
      setStatusData([
        { name: "Diterima", value: diterima, color: "#3b82f6" },
        { name: "Distribusi", value: distribusi, color: "#8b5cf6" },
        { name: "Diproses", value: diproses, color: "#f59e0b" },
        { name: "Review Ka-P4M", value: review, color: "#6366f1" },
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

  // Batas waktu (SLA) sebelum laporan yang belum selesai dianggap "Overdue".
  // Ubah angka ini kalau ternyata aturan SLA di kampus beda.
  const SLA_HARI = 7;

  const overdueCount = dataLaporan.filter((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const it = item as any;
    if (it.status === "Close") return false; // sudah selesai, gak mungkin overdue
    if (!it.tanggal_submit) return false;

    const tanggalMasuk = new Date(it.tanggal_submit).getTime();
    if (isNaN(tanggalMasuk)) return false;

    const hariBerjalan = (Date.now() - tanggalMasuk) / (1000 * 60 * 60 * 24);
    return hariBerjalan > SLA_HARI;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-125">
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
        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-blue-100 text-sm">Total Laporan</p><p className="text-3xl font-bold mt-2">{totalLaporan}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><FileText size={24} /></div>
          </div>
        </div>
        <div className="bg-linear-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-yellow-100 text-sm">Diproses</p><p className="text-3xl font-bold mt-2">{prosesCount}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
          </div>
        </div>
        <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-green-100 text-sm">Selesai</p><p className="text-3xl font-bold mt-2">{selesaiCount}</p></div>
            <div className="bg-white/20 p-3 rounded-2xl"><CheckCircle2 size={24} /></div>
          </div>
        </div>
        <div className="bg-linear-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
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
    </>
  );
}