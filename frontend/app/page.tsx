"use client";
import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import SubmissionForm from "@/components/forms/SubmissionForm";
import StatusTable from "@/components/status/StatusTable";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"form" | "status" | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-12">
        <HeroSection />

        {/* Navigation Section */}
        <div className="flex flex-wrap gap-4 mb-10">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-2 px-5 py-2 shadow-sm font-bold transition-all ${
              activeTab === "form"
                ? "bg-blue-600 scale-95"
                : "bg-blue-polibatam hover:bg-blue-400"
            } text-white`}
          >
            <span className="text-lg">📝</span> Form Pengajuan
          </button>

          <button
            onClick={() => setActiveTab("status")}
            className={`px-5 py-2 shadow-sm font-bold transition-all ${
              activeTab === "status"
                ? "bg-blue-600 scale-95"
                : "bg-blue-polibatam hover:bg-blue-400"
            } text-white`}
          >
            Lihat Status Pengajuan
          </button>
        </div>

        {/* Content Area */}
        <div className="relative">
          {activeTab === "form" && <SubmissionForm />}
          {activeTab === "status" && <StatusTable />}

          {!activeTab && (
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-xl">
              <p>
                Silahkan pilih menu &quot;Form Pengajuan&quot; atau &quot;Lihat
                Status&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
