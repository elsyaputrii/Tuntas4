'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DiscrepancyTable from '@/components/kepala-unit/DiscrepancyTable';

export default function KetidaksesuaianMasukPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

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

      <DiscrepancyTable />
    </div>
  );
}