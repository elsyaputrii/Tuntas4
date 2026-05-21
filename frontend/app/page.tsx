"use client";
import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import SubmissionForm from "@/components/forms/SubmissionForm";
import StatusChecker from "@/components/status/StatusChecker";
import FAQSection from "@/components/FAQ";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"form" | "status" | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">


{/* Navbar */}
<nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b">
  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

    {/* LOGO */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <h1 className="font-bold text-gray-800 text-lg">
          TUNTAS
        </h1>

        <p className="text-xs text-gray-500">
          Politeknik Negeri Batam
        </p>
      </div>
    </div>

    {/* DESKTOP MENU */}
    <div className="hidden md:flex items-center gap-8">

      {/* BERANDA */}
      <button
        onClick={() => setActiveTab(null)}
        className={`relative font-semibold transition-all duration-300 hover:text-blue-600 hover:scale-105
          ${
            activeTab === null
              ? "text-blue-600"
              : "text-gray-600"
          }`}
      >
        <div className="flex items-center gap-2">
          <span>🏠</span>
        </div>

        {activeTab === null && (
          <div className="absolute -bottom-2 left-0 w-full h-[3px] bg-blue-600 rounded-full" />
        )}
      </button>

      {/* BUAT LAPORAN */}
      <button
        onClick={() => setActiveTab("form")}
        className={`relative font-semibold transition-all duration-300 hover:text-blue-600 hover:scale-105
          ${
            activeTab === "form"
              ? "text-blue-600"
              : "text-gray-600"
          }`}
      >
        <div className="flex items-center gap-2">
          <span>📝</span>
        </div>

        {activeTab === "form" && (
          <div className="absolute -bottom-2 left-0 w-full h-[3px] bg-blue-600 rounded-full" />
        )}
      </button>

      {/* STATUS */}
      <button
        onClick={() => setActiveTab("status")}
        className={`relative font-semibold transition-all duration-300 hover:text-blue-600 hover:scale-105
          ${
            activeTab === "status"
              ? "text-blue-600"
              : "text-gray-600"
          }`}
      >
        <div className="flex items-center gap-2">
          <span>🔍</span>
        </div>

        {activeTab === "status" && (
          <div className="absolute -bottom-2 left-0 w-full h-[3px] bg-blue-600 rounded-full" />
        )}
      </button>

      {/* FAQ */}
      <button
        onClick={() => {
          setActiveTab(null);

          setTimeout(() => {
            document
              .getElementById("faq")
              ?.scrollIntoView({
                behavior: "smooth",
              });
          }, 100);
        }}
        className="relative font-semibold transition-all duration-300 hover:text-blue-600 hover:scale-105 text-gray-600"
      >
        <div className="flex items-center gap-2">
          <span>❓</span>
        </div>
      </button>
    </div>

    {/* MOBILE MENU */}
    <div className="flex md:hidden items-center gap-2">

      {/* FORM */}
      <button
        onClick={() => setActiveTab("form")}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
          ${
            activeTab === "form"
              ? "bg-blue-600 text-white shadow-lg"
              : "border border-blue-600 text-blue-600"
          }`}
      >
        📝 Laporan
      </button>

      {/* STATUS */}
      <button
        onClick={() => setActiveTab("status")}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
          ${
            activeTab === "status"
              ? "bg-blue-600 text-white shadow-lg"
              : "border border-blue-600 text-blue-600"
          }`}
      >
        🔍 Status
      </button>
    </div>
  </div>
</nav>

      {/* Hero */}
      {!activeTab && <HeroSection onBuatLaporan={() => setActiveTab("form")} onCekStatus={() => setActiveTab("status")} />}

      {/* Form / Status */}
      {activeTab && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <button onClick={() => setActiveTab(null)} className="hover:text-blue-600">Beranda</button>
            <span>/</span>
            <span className="text-blue-600 font-medium">{activeTab === "form" ? "Buat Laporan" : "Cek Status Laporan"}</span>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit mb-6">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "form" ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"}`}
            >
              📝 Buat Laporan
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "status" ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"}`}
            >
              🔍 Cek Status
            </button>
          </div>

          {activeTab === "form" && <SubmissionForm />}
          {activeTab === "status" && <StatusChecker />}
        </div>
      )}

      {/* FAQ Section */}
      {!activeTab && (
        <div id="faq">
          <FAQSection />
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs font-bold">T</div>
            <span className="font-bold">TUNTAS</span>
          </div>
          <p className="text-gray-400 text-sm">Politeknik Negeri Batam - Sistem Penanganan Ketidaksesuaian</p>
          <p className="text-gray-500 text-xs mt-2">©Polibatam. Semua hak dilindungi.</p>
        </div>
      </footer>
    </main>
  );
}