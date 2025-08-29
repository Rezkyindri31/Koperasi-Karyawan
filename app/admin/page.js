"use client";
import Header from "@/components/header";
import AuthGuard from "@/components/auth-guard";
import CardDetailSimpanan from "./beranda/components/card-detail-admin";

export default function Page() {
  return (
    <div>
      <AuthGuard allow={["admin"]}>
        <Header />
        <div className="bg-white h-full">
          <CardDetailSimpanan />
        </div>
      </AuthGuard>
    </div>
  );
}
