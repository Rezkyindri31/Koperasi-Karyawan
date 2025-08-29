"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/src/lib/axios";

export default function AuthGuard({ allow = ["admin", "karyawan"], children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  // helper: tentukan base path -> "admin" atau "karyawan"
  const basePath = pathname.startsWith("/admin") ? "admin" : "karyawan";

  useEffect(() => {
    const token =
      typeof window !== "undefined" && localStorage.getItem("token");
    if (!token) {
      router.replace(`/${basePath}/sign-in`);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get("/me");

        // role user ada di daftar allow?
        if (!allow.includes(data.role)) {
          router.replace(data.role === "admin" ? "/admin" : "/karyawan");
          return;
        }

        setOk(true);
      } catch {
        localStorage.removeItem("token");
        router.replace(`/${basePath}/sign-in`);
      }
    })();
  }, [router, allow, basePath]);

  if (!ok) return <div className="p-6">Loading...</div>;
  return <>{children}</>;
}
