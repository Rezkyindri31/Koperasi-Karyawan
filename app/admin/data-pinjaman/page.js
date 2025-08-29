"use client";
import Header from "@/components/header";
import TablePinjaman from "./components/table-pinjaman";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["admin"]}>
      <div>
        <Header />
        <TablePinjaman />
      </div>
    </AuthGuard>
  );
}
