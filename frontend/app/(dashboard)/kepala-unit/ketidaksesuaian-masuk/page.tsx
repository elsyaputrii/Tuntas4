'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiscrepancyTable from '@/components/kepala-unit/DiscrepancyTable';

export default function KetidaksesuaianMasukPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'kepala_unit') {
      router.replace('/kepala-unit/login');
      return;
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        📋 Ketidaksesuaian Masuk
      </h2>
      <DiscrepancyTable />
    </div>
  );
}