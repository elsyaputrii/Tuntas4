import LoginForm from '@/components/auth/LoginForm';

export default function KepalaUnitLoginPage() {
  return (
    <LoginForm 
      role="kepala_unit" 
      forgotPasswordPath="/kepala-unit/forgot-password"
      redirectAfterLogin="/kepala-unit"
    />
  );
}