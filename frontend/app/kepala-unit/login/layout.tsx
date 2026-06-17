// Layout kosong khusus login — bypass layout kepala-unit
// supaya background full screen tidak terpotong container/padding
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}