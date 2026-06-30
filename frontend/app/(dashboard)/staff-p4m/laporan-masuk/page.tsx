import IncomingReportTable from '@/components/staff-p4m/tables/IncomingReportTable';

export default function LaporanMasukPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        📩 Laporan Masuk
      </h2>
      <IncomingReportTable />
    </div>
  );
}