// FILE: frontend/app/staff-p4m/reset-password/page.tsx
// Suspense wajib karena ResetPasswordForm pakai useSearchParams (Next.js rule)

import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-800">
        <p className="text-white">Memuat...</p>
      </div>
    }>
      <ResetPasswordForm loginPath="/staff-p4m/login" />
    </Suspense>
  );
}