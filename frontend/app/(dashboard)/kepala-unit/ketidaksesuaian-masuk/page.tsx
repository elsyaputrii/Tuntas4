'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DiscrepancyTable from '@/components/kepala-unit/DiscrepancyTable';
import StafDecisionTable from '@/components/kepala-unit/StafDecisionTable';

type TabType = 'baru' | 'keputusan-staf';

export default function KetidaksesuaianMasukPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('baru');
  const isMounted = useRef(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      
      if (!token || role !== 'kepala_unit') {
        router.replace('/kepala-unit/login');
        return;
      }
      
      if (isMounted.current) {
        setIsChecking(false);
      }
    };

    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        📋 Ketidaksesuaian Masuk
      </h2>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('baru')}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'baru'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📋 Laporan Baru
        </button>
        <button
          onClick={() => setActiveTab('keputusan-staf')}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'keputusan-staf'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          📋 Keputusan Staf
        </button>
      </div>

      <div>
        {activeTab === 'baru' && <DiscrepancyTable />}
        {activeTab === 'keputusan-staf' && <StafDecisionTable />}
      </div>
    </div>
  );
}