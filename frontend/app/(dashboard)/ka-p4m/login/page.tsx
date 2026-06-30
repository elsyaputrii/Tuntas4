import LoginForm from '@/components/auth/LoginForm';

export default function KaP4MLoginPage() {
  return (
    <LoginForm 
      role="ka_p4m" 
      forgotPasswordPath="/ka-p4m/forgot-password"
      redirectAfterLogin="/ka-p4m"
    />
  );
}