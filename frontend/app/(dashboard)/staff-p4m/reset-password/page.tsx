// FILE: frontend/app/(dashboard)/staff-p4m/reset-password/page.tsx
// Dibuka dari link di email reset password (roleToUrlMap: staf_p4m → staff-p4m)

"use client";

import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function StaffP4MResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm loginPath="/login" />
    </Suspense>
  );
}