"use client";
import Header from "@/components/header";
import TableSimpanan from "./components/table-simpanan-saya";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["karyawan"]}>
      <div>
        <Header />
        <TableSimpanan />
      </div>
    </AuthGuard>
  );
}
