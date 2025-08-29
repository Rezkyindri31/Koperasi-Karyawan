"use client";
import Header from "@/components/header";
import TableSimpanan from "./components/table-simpanan";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["admin"]}>
      <div>
        <Header />
        <TableSimpanan />
      </div>
    </AuthGuard>
  );
}
