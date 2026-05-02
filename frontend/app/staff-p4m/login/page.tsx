// FILE: frontend/app/staff-p4m/login/page.tsx
import LoginForm from "@/components/auth/LoginForm";

export default function Page() {
  return (
    <LoginForm
      role="staf_p4m"
      forgotPasswordPath="/staff-p4m/forgot-password"
      redirectAfterLogin="/staff-p4m"
    />
  );
}