// FILE: frontend/app/kepala-unit/forgot-password/page.tsx
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function Page() {
  return (
    <ForgotPasswordForm
      role="kepala_unit"
      loginPath="/kepala-unit/login"
    />
  );
}