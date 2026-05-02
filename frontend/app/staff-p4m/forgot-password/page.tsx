// FILE: frontend/app/staff-p4m/forgot-password/page.tsx
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function Page() {
  return (
    <ForgotPasswordForm
      role="staf_p4m"
      loginPath="/staff-p4m/login"
    />
  );
}