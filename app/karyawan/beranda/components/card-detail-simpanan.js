"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MdOutlineSavings } from "react-icons/md";
import { IoCashOutline } from "react-icons/io5";
import { api } from "@/src/lib/axios";

export default function CardDetailSimpanan({
  year: yearProp,
  userId: userIdProp,
}) {
  const year = useMemo(() => {
    if (typeof yearProp === "number") return yearProp;
    const y = new Date().getFullYear();
    return y;
  }, [yearProp]);

  const [loading, setLoading] = useState(false);
  const [totalWajib, setTotalWajib] = useState(0);
  const [totalPokok, setTotalPokok] = useState(0);
  const [dividend, setDividend] = useState(0);

  const formatIDR = (n) =>
    isFinite(n)
      ? n.toLocaleString("id-ID", { style: "currency", currency: "IDR" })
      : "Rp 0";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const summaryParams = { year };
        if (userIdProp) summaryParams.user_id = userIdProp;
        const [{ data: sum }, { data: div }] = await Promise.all([
          api.get("/savings/summary", { params: summaryParams }),
          api.get("/dividend", {
            params: { year, ...(userIdProp ? { user_id: userIdProp } : {}) },
          }),
        ]);
        if (!alive) return;

        setTotalWajib(Number(sum?.total_wajib ?? 0));
        setTotalPokok(Number(sum?.total_pokok ?? 0));
        setDividend(Number(div?.dividend ?? 0));
      } catch (e) {
        if (!alive) return;
        setTotalWajib(0);
        setTotalPokok(0);
        setDividend(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year, userIdProp]);

  return (
    <div className="px-5 my-5">
      <h1 className="text-3xl items-start font-bold mb-2 bg-[#5bc0de] px-3 py-2 rounded text-white">
        Detail Data Nasabah Koperasi
        <div className="text-sm text-gray-500 mb-2">Tahun: {year}</div>
      </h1>
      <div className="flex flex-col gap-y-10 items-center p-4 rounded-lg">
        <div className="flex flex-row gap-x-7 justify-between">
          <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
            <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">Total Simpanan Wajib</h2>
              <MdOutlineSavings className="h-6 w-6" />
            </div>
            <div className="card-body px-4 py-8 text-center">
              <p className={loading ? "" : "text-2xl font-bold text-gray-800"}>
                {loading ? "Memuat..." : formatIDR(totalWajib)}
              </p>
            </div>
          </div>
          <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
            <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">Total Simpanan Pokok</h2>
              <MdOutlineSavings className="h-6 w-6" />
            </div>
            <div className="card-body px-4 py-8 text-center">
              <p className={loading ? "" : "text-2xl font-bold text-gray-800"}>
                {loading ? "Memuat..." : formatIDR(totalPokok)}
              </p>
            </div>
          </div>
          <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
            <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">
                Total Bagi Hasil Tahunan
              </h2>
              <IoCashOutline className="h-6 w-6" />
            </div>
            <div className="card-body px-4 py-8 text-center">
              <p className={loading ? "" : "text-2xl font-bold text-gray-800"}>
                {loading ? "Memuat..." : formatIDR(dividend)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
