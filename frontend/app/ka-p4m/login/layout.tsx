// Layout kosong khusus login — bypass layout ka-p4m
// supaya background full screen tidak terpotong container/padding
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}