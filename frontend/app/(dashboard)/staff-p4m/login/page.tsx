import LoginForm from '@/components/auth/LoginForm';

export default function StaffP4MLoginPage() {
  return (
    <LoginForm 
      role="staf_p4m" 
      forgotPasswordPath="/staff-p4m/forgot-password"
      redirectAfterLogin="/staff-p4m"
    />
  );
}