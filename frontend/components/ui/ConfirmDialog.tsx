// FILE: frontend/components/ui/ConfirmDialog.tsx
//
// Modal konfirmasi generik. Dipakai sebelum aksi yang tidak bisa
// dibatalkan (mis. tombol "Kirim" ke Kepala Unit) benar-benar
// dieksekusi — supaya user tidak salah klik dan kirim laporan yang
// belum selesai diisi/dicek.
"use client";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Konfirmasi",
  message,
  confirmLabel = "Kirim",
  cancelLabel = "Batal",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border-2 border-black w-full max-w-sm p-5 shadow-2xl">
        <h3 className="font-bold text-sm uppercase mb-2 border-b-2 border-black pb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-700 my-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold uppercase border border-black rounded hover:bg-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold uppercase bg-blue-polibatam text-white rounded shadow hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {loading ? "Mengirim..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
