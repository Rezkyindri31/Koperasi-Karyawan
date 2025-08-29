"use client";
import Header from "@/components/header";
import TablePelunasan from "./components/table-pelunasan";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["admin"]}>
      <div>
        <Header />
        <TablePelunasan />
      </div>
    </AuthGuard>
  );
}
