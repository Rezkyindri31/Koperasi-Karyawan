"use client";
import Header from "@/components/header";
import AuthGuard from "@/components/auth-guard";
import CardDetailSimpanan from "./beranda/components/card-detail-simpanan";
import GrafikSimpanan from "./beranda/components/grafik-simpanan";

export default function Page() {
  return (
    <div>
      <AuthGuard allow={["karyawan"]}>
        <Header />
        <div className="bg-white h-full">
          <CardDetailSimpanan />
          <GrafikSimpanan />
        </div>
      </AuthGuard>
    </div>
  );
}
