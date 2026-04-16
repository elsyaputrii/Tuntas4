"use client";
import { useState } from 'react';
import StaffHero from '@/components/staff-p4m/StaffHero';
import StaffNavigation from '@/components/staff-p4m/StaffNavigation';
import IncomingReportTable from '@/components/staff-p4m/tables/IncomingReportTable';
import ProcessMonitorTable from '@/components/staff-p4m/tables/ProcessMonitorTable';
import RecapitulationTable from '@/components/staff-p4m/tables/RecapitulationTable';

export default function StaffP4MPage() {
  // 'incoming' | 'process' | 'recap'
  const [activeTab, setActiveTab] = useState('incoming');

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-12">
      <div className="max-w-[95%] mx-auto"> {/* Tabel P4M lebar, jadi container dibuat lebar */}
        <StaffHero />
        
        <StaffNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6 transition-all duration-300 animate-in fade-in">
          {activeTab === 'incoming' && <IncomingReportTable />}
          {activeTab === 'process' && <ProcessMonitorTable />}
          {activeTab === 'recap' && <RecapitulationTable />}
        </div>
      </div>
    </main>
  );
}