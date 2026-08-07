// FILE: frontend/app/forgot-password/page.tsx
// Halaman lupa password generik — dituju dari link "lupa password?"
// di halaman /login. Role dipilih lewat dropdown di dalam form
// (karena login sekarang cuma 1 pintu untuk semua role).

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm loginPath="/login" />;
}