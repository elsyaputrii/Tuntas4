// components/status/StatusChecker.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function StatusChecker() {
  const [ticket, setTicket] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [previewImage, setPreviewImage] = useState(false);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticket) {
      alert("Masukkan nomor tiket");
      return;
    }

    setShowResult(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
            Tracking Laporan
          </span>

          <h1 className="text-3xl md:text-4xl font-bold mt-4 leading-tight">
            Cek Status Laporan Anda
          </h1>

          <p className="text-blue-100 mt-3 max-w-2xl">
            Masukkan nomor tiket untuk melihat perkembangan laporan secara realtime.
          </p>
        </div>

        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full" />
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 md:p-8">
        <form onSubmit={handleCheck} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Nomor Tiket
            </label>

            <input
              type="text"
              placeholder="Contoh: KT-2025-000123"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-fit bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg hover:scale-[1.02]"
          >
            🔍 Cari Status
          </button>
        </form>
      </div>

      {/* Result */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* LEFT */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">
                📄
              </div>

              <div>
                <h2 className="font-bold text-xl text-gray-800">
                  Detail Laporan
                </h2>

                <p className="text-gray-500 text-sm">
                  Informasi laporan civitas akademik
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Nomor Tiket</span>
                <span className="font-semibold text-gray-800">
                  KT-2025-000123
                </span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Tanggal Laporan</span>
                <span className="font-semibold text-gray-800">
                  10 Mei 2025
                </span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Input Status</span>
                <span className="font-semibold text-gray-800">
                  Mahasiswa
                </span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Jenis Laporan</span>
                <span className="font-semibold text-gray-800">
                  Fasilitas
                </span>
              </div>

              <div>
                <p className="text-gray-500 mb-2">
                  Isi Laporan
                </p>

                <div className="bg-gray-50 rounded-2xl p-4 text-gray-700 leading-relaxed">
                  Toilet gedung utama tidak bersih dan sabun sering kosong.
                  Mohon ditindaklanjuti.
                </div>
              </div>

              {/* IMAGE */}
              <div>
                <p className="text-gray-500 mb-3">
                  Bukti Lampiran
                </p>

                <div
                  onClick={() => setPreviewImage(true)}
                  className="relative group cursor-pointer w-40"
                >
                  <Image
                    src="/sample-bukti.jpg"
                    alt="Bukti"
                    width={200}
                    height={200}
                    className="rounded-2xl object-cover border shadow-md group-hover:scale-105 transition"
                  />

                  <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold">
                    Perbesar
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-2xl">
                🚀
              </div>

              <div>
                <h2 className="font-bold text-xl text-gray-800">
                  Progress Laporan
                </h2>

                <p className="text-gray-500 text-sm">
                  Pantau proses laporan Anda
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {[
                {
                  title: "Laporan Diterima",
                  active: true,
                },
                {
                  title: "Diproses Unit Terkait",
                  active: true,
                },
                {
                  title: "Review P4M",
                  active: false,
                },
                {
                  title: "Monitoring",
                  active: false,
                },
                {
                  title: "Selesai",
                  active: false,
                },
              ].map((item, index) => (
                <div key={index} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        item.active
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />

                    {index !== 4 && (
                      <div className="w-1 h-16 bg-gray-200" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {item.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {item.active
                        ? "Tahap selesai diproses"
                        : "Menunggu proses"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* STATUS */}
            <div className="mt-10 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <div className="text-2xl">
                  ℹ️
                </div>

                <div>
                  <h4 className="font-bold text-blue-700 mb-1">
                    Update Terbaru
                  </h4>

                  <p className="text-sm text-gray-700 leading-relaxed">
                    Unit terkait sedang melakukan tindak lanjut terhadap laporan Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODAL IMAGE */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <div className="relative">
            <Image
              src="/sample-bukti.jpg"
              alt="Preview"
              width={700}
              height={700}
              className="rounded-3xl max-h-[90vh] object-contain"
            />

            <button
              className="absolute -top-3 -right-3 bg-white text-black rounded-full w-10 h-10 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}