"use client";
import Header from "@/components/header";
import FormTambahSimpanan from "./components/tambah-simpanan";
import AuthGuard from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard allow={["admin"]}>
      <div>
        <Header />
        <FormTambahSimpanan />
      </div>
    </AuthGuard>
  );
}
