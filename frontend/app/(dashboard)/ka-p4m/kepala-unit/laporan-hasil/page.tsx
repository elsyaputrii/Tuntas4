'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ResultReportTable from '@/components/kepala-unit/ResultReportTable';

export default function KaP4MKepalaUnitLaporanHasilPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');

      if (!token || !userRaw) {
        router.replace('/ka-p4m/login');
        return;
      }
      try {
        const user = JSON.parse(userRaw);
        if (user.role !== 'ka_p4m') {
          router.replace('/ka-p4m/login');
          return;
        }
      } catch {
        router.replace('/ka-p4m/login');
        return;
      }

      if (isMounted.current) setIsChecking(false);
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
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
        ✅ Laporan Hasil — Kepala Unit P4M
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Isi bukti pelaksanaan tindak lanjut untuk laporan unit P4M yang sudah disetujui Ka P4M.
      </p>

      <ResultReportTable />
    </div>
  );
}