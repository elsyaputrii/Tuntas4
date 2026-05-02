// FILE: frontend/app/ka-p4m/login/page.tsx
import LoginForm from "@/components/auth/LoginForm";

export default function Page() {
  return (
    <LoginForm
      role="ka_p4m"
      forgotPasswordPath="/ka-p4m/forgot-password"
      redirectAfterLogin="/ka-p4m"
    />
  );
}