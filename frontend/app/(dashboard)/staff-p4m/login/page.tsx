import { redirect } from "next/navigation";

// Halaman login sekarang disatukan di /login.
// Path ini dipertahankan supaya link/bookmark lama tidak 404.
export default function StaffP4MLoginPage() {
  redirect("/login");
}