"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function TableSimpananSaya() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterType, setFilterType] = useState("");

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [divCache, setDivCache] = useState({});

  const formatIDR = (n) => {
    const num = Number(n);
    return Number.isFinite(num)
      ? num.toLocaleString("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        })
      : "";
  };

  const monthLabel = (val) => (val ? String(val).slice(0, 7) : "");
  const dividendForYear = (year) => {
    const val = divCache[year];
    return val == null ? "…" : formatIDR(val);
  };

  const queryParams = useMemo(() => {
    const p = { page };
    if (filterMonth) p.month = filterMonth;
    if (filterType) p.type = filterType;
    return p;
  }, [page, filterMonth, filterType]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/savings", { params: queryParams });

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        const current_page = data?.current_page ?? page;
        const last_page = data?.last_page ?? 1;
        const total = data?.total ?? items.length;

        if (alive) {
          setRows(items);
          setMeta({ current_page, last_page, total });
        }
      } catch {
        if (alive) {
          setRows([]);
          setMeta({ current_page: 1, last_page: 1, total: 0 });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [queryParams.page, queryParams.month, queryParams.type]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const years = new Set();
      rows.forEach((r) => {
        if (!r?.month) return;
        const y = String(r.month).slice(0, 4);
        if (/^\d{4}$/.test(y) && divCache[y] == null) years.add(y);
      });
      if (years.size === 0) return;

      try {
        const listYears = Array.from(years);
        const results = await Promise.allSettled(
          listYears.map((y) =>
            api.get("/dividend", { params: { year: Number(y) } })
          )
        );
        const next = { ...divCache };
        results.forEach((res, i) => {
          const yr = listYears[i];
          next[yr] =
            res.status === "fulfilled"
              ? Number(res.value?.data?.dividend ?? 0)
              : 0;
        });
        if (alive) setDivCache(next);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [rows, divCache]);

  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterType]);

  const chartData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const key = monthLabel(r.month);
      const amt = Number(r.amount ?? 0);
      map[key] = (map[key] ?? 0) + (Number.isFinite(amt) ? amt : 0);
    });
    const months = Object.keys(map).sort();
    return months.map((m) => ({ month: m, total: map[m] }));
  }, [rows]);

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 ">
      <h1 className="text-3xl font-bold mb-2">Tabel Data Simpanan Saya</h1>
      <div className="mb-6 rounded-box border border-base-content/5 bg-base-100 p-4">
        <h2 className="text-xl font-semibold mb-3">Tren Simpanan per Bulan</h2>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(v) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`;
                  return `${v / 1000}rb`; // kalau < 1 juta pakai "rb"
                }}
              />
              <Tooltip
                formatter={(value) => [formatIDR(value), "Total Simpanan"]}
                labelFormatter={(label) => `Bulan: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total Simpanan" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
