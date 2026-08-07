// FILE: frontend/app/(dashboard)/kepala-unit/reset-password/page.tsx
// Dibuka dari link di email reset password (roleToUrlMap: kepala_unit → kepala-unit)

"use client";

import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function KepalaUnitResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm loginPath="/login" />
    </Suspense>
  );
}