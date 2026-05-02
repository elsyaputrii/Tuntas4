// FILE: frontend/app/ka-p4m/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-800">
        <p className="text-white">Memuat...</p>
      </div>
    }>
      <ResetPasswordForm loginPath="/ka-p4m/login" />
    </Suspense>
  );
}