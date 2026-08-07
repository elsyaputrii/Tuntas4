// FILE: frontend/app/(dashboard)/ka-p4m/reset-password/page.tsx
// Dibuka dari link di email reset password (roleToUrlMap: ka_p4m → ka-p4m)

"use client";

import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function KaP4MResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm loginPath="/login" />
    </Suspense>
  );
}