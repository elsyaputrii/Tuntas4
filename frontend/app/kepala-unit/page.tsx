"use client";
import { useState, useEffect, startTransition } from "react"; // ← tambah startTransition
import { useRouter } from "next/navigation";
import UnitHero from "@/components/kepala-unit/UnitHero";
import UnitNavigation from "@/components/kepala-unit/UnitNavigation";
import DiscrepancyTable from "@/components/kepala-unit/DiscrepancyTable";
import ResultReportTable from "@/components/kepala-unit/ResultReportTable";

export default function KepalaUnitPage() {
  const [activeTab, setActiveTab]   = useState("discrepancy");
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");

    if (!token || role !== "kepala_unit") {
      router.replace("/kepala-unit/login");
    } else {
      // ✅ FIX: bungkus dengan startTransition agar tidak sinkron
      startTransition(() => {
        setIsChecking(false);
      });
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#5da0dd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <UnitHero />
        <UnitNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="mt-6">
          {activeTab === "discrepancy" && <DiscrepancyTable />}
          {activeTab === "report"      && <ResultReportTable />}
        </div>
      </div>
    </main>
  );
}