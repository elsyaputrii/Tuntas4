import ProcessMonitorTable from '@/components/staff-p4m/tables/ProcessMonitorTable';

export default function ProsesPantauPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        🔄 Proses & Pantau
      </h2>
      <ProcessMonitorTable />
    </div>
  );
}