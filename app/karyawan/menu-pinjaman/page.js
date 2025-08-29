"use client";
import Header from "@/components/header";
import FormPinjaman from "./components/form-pinjaman";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["karyawan"]}>
      <div>
        <Header />
        <FormPinjaman />
      </div>
    </AuthGuard>
  );
}
