"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StaffHero from '@/components/staff-p4m/StaffHero';
import StaffNavigation from '@/components/staff-p4m/StaffNavigation';
import IncomingReportTable from '@/components/staff-p4m/tables/IncomingReportTable';
import ProcessMonitorTable from '@/components/staff-p4m/tables/ProcessMonitorTable';
import RecapitulationTable from '@/components/staff-p4m/tables/RecapitulationTable';

export default function StaffP4MPage() {
  const router             = useRouter();
  const [activeTab, setActiveTab] = useState('incoming');
  const [bolehRender, setBolehRender] = useState(false);

  useEffect(() => {
    // Cek apakah ada token dan role-nya staf_p4m
    const token = localStorage.getItem("token");
    const raw   = localStorage.getItem("user");

    if (!token || !raw) {
      // Belum login → redirect ke halaman login
      router.push("/staff-p4m/login");
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.role !== "staf_p4m") {
        // Role salah → redirect ke login
        router.push("/staff-p4m/login");
        return;
      }
      // Lolos semua pengecekan → tampilkan halaman
      setTimeout(() => setBolehRender(true), 0);
    } catch {
      router.push("/staff-p4m/login");
    }
  }, [router]);

  // Jangan tampilkan apapun selama cek berlangsung
  if (!bolehRender) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-12">
      <div className="max-w-[95%] mx-auto">
        <StaffHero />

        <StaffNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-4 sm:mt-6 transition-all duration-300 animate-in fade-in">
          {activeTab === 'incoming' && <IncomingReportTable />}
          {activeTab === 'process'  && <ProcessMonitorTable />}
          {activeTab === 'recap'    && <RecapitulationTable />}
        </div>
      </div>
    </main>
  );
}