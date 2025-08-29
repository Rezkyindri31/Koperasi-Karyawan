"use client";
import Header from "@/components/header";
import TablePinjamanSaya from "./components/table-pinjaman-saya";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["karyawan"]}>
      <div>
        <Header />
        <TablePinjamanSaya />
      </div>
    </AuthGuard>
  );
}
