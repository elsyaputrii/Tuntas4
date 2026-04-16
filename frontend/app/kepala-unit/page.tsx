"use client";
import { useState } from 'react';
import UnitHero from '@/components/kepala-unit/UnitHero';
import UnitNavigation from '@/components/kepala-unit/UnitNavigation';
import DiscrepancyTable from '@/components/kepala-unit/DiscrepancyTable';
import ResultReportTable from '@/components/kepala-unit/ResultReportTable';

export default function KepalaUnitPage() {
  const [activeTab, setActiveTab] = useState('discrepancy');

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <UnitHero />
        <UnitNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'discrepancy' && <DiscrepancyTable />}
          {activeTab === 'report' && <ResultReportTable />}
        </div>
      </div>
    </main>
  );
}