import RecapitulationTable from '@/components/staff-p4m/tables/RecapitulationTable';

export default function RekapitulasiPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white px-3 pt-3">
        📊 Rekapitulasi
      </h2>
      <RecapitulationTable />
    </div>
  );
}