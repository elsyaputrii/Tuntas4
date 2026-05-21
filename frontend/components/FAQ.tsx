// components/FAQ.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "Apakah laporan bersifat anonim?",
    answer:
      "Ya. Sistem TUNTAS mendukung pelaporan anonim tanpa perlu login.",
  },
  {
    question: "Bagaimana cara mengecek status laporan?",
    answer:
      "Gunakan nomor tiket yang diberikan setelah laporan berhasil dikirim.",
  },
  {
    question: "Apakah bisa upload gambar bukti?",
    answer:
      "Bisa. Sistem mendukung upload gambar, screenshot, dan dokumen pendukung.",
  },
  {
    question: "Siapa yang memproses laporan?",
    answer:
      "Laporan akan diproses unit terkait dan dipantau langsung oleh P4M.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-7xl mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <span className="bg-blue-100 text-blue-700 px-5 py-2 rounded-full text-sm font-semibold">
          FAQ TUNTAS
        </span>

        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mt-6">
          Pertanyaan Umum
        </h2>

        <p className="text-gray-500 mt-5 max-w-2xl mx-auto leading-relaxed">
          Temukan jawaban mengenai sistem pelaporan ketidaksesuaian TUNTAS Polibatam.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* LEFT */}
        <div className="space-y-5">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              layout
              className="bg-white rounded-3xl shadow-lg border overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="w-full flex justify-between items-center p-6 text-left"
              >
                <span className="font-semibold text-lg text-gray-800">
                  {faq.question}
                </span>

                <div className="text-blue-600 text-2xl font-bold">
                  {open === index ? "−" : "+"}
                </div>
              </button>

              <AnimatePresence>
                {open === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 text-gray-600 leading-relaxed"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl"
        >
          <div className="relative z-10">
            <span className="bg-white/20 px-4 py-2 rounded-full text-sm">
              TUNTAS POLIBATAM
            </span>

            <h3 className="text-4xl font-bold mt-6 leading-tight">
              Sistem Pelaporan Modern untuk Civitas Akademik
            </h3>

            <p className="mt-6 text-blue-100 leading-relaxed">
              Sampaikan kritik, saran, dan ketidaksesuaian dengan mudah,
              cepat, dan transparan tanpa perlu login.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                  🔒
                </div>

                <span className="font-medium">
                  Laporan anonim & aman
                </span>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                  🖼️
                </div>

                <span className="font-medium">
                  Upload bukti laporan
                </span>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                  📡
                </div>

                <span className="font-medium">
                  Tracking realtime
                </span>
              </div>
            </div>
          </div>

          {/* decoration */}
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-white/10 rounded-full" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full" />
        </motion.div>
      </div>
    </section>
  );
}