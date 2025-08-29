"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MdOutlineSavings } from "react-icons/md";
import { FaRegUser } from "react-icons/fa";
import { RiAdminLine } from "react-icons/ri";
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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const formatIDR = (val) => {
    try {
      const num = typeof val === "string" ? Number(val) : val;
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(num || 0);
    } catch {
      return `Rp ${val}`;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/users/summary");
        if (!mounted) return;
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.message || "Gagal memuat ringkasan.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const adminCount = data?.roles?.admin ?? 0;
  const karyawanCount = data?.roles?.karyawan ?? 0;
  const totalSavings = data?.total_savings ?? 0;
  const totalLoans = data?.total_loans ?? 0;

  return (
    <div className="px-5 my-5">
      <h1 className="text-3xl items-start font-bold mb-2 bg-[#5bc0de] px-3 py-2 rounded text-white">
        Ringkasan Data Koperasi
        <div className="text-sm text-gray-500 mb-2">Tahun: {year}</div>
      </h1>

      {loading && (
        <div className="w-full flex justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {err && !loading && (
        <div className="alert alert-error max-w-2xl">
          <span>{err}</span>
        </div>
      )}

      {!loading && !err && (
        <div className="flex flex-col gap-y-8 items-center p-4 rounded-lg">
          <div className="flex flex-row gap-x-7 justify-between">
            <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
              <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                <h2 className="text-lg font-semibold">Jumlah Admin</h2>
                <RiAdminLine className="h-6 w-6" />
              </div>
              <div className="card-body px-4 py-8 text-center">
                <p
                  className={loading ? "" : "text-2xl font-bold text-gray-800"}
                >
                  {adminCount}
                </p>
              </div>
            </div>
            <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
              <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                <h2 className="text-lg font-semibold">Jumlah Karyawan</h2>
                <FaRegUser className="h-6 w-6" />
              </div>
              <div className="card-body px-4 py-8 text-center">
                <p
                  className={loading ? "" : "text-2xl font-bold text-gray-800"}
                >
                  {karyawanCount}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-x-7 justify-between">
            <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
              <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                <h2 className="text-lg font-semibold">Total Simpanan</h2>
                <MdOutlineSavings className="h-6 w-6" />
              </div>
              <div className="card-body px-4 py-8 text-center">
                <p
                  className={loading ? "" : "text-2xl font-bold text-gray-800"}
                >
                  {formatIDR(totalSavings)}
                </p>
              </div>
            </div>
            <div className="card w-80 bg-base-100 shadow-md border border-gray-200">
              <div className="bg-sky-400 text-white flex justify-between items-center px-4 py-3 rounded-t-lg">
                <h2 className="text-lg font-semibold">Total Pinjaman</h2>
                <IoCashOutline className="h-6 w-6" />
              </div>
              <div className="card-body px-4 py-8 text-center">
                <p
                  className={loading ? "" : "text-2xl font-bold text-gray-800"}
                >
                  {formatIDR(totalLoans)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
