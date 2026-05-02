// FILE: frontend/app/kepala-unit/login/page.tsx
import LoginForm from "@/components/auth/LoginForm";

export default function Page() {
  return (
    <LoginForm
      role="kepala_unit"
      forgotPasswordPath="/kepala-unit/forgot-password"
      redirectAfterLogin="/kepala-unit"
    />
  );
}