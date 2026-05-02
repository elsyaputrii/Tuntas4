// FILE: frontend/app/ka-p4m/forgot-password/page.tsx
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function Page() {
  return (
    <ForgotPasswordForm
      role="ka_p4m"
      loginPath="/ka-p4m/login"
    />
  );
}