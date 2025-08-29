"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
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

  const exportCsvCurrentPage = () => {
    const header = [
      "No",
      "Bulan",
      "Jenis",
      "Jumlah",
      "Bagi Hasil Tahunan",
    ].join(",");
    const body = rows.map((r, idx) => {
      const yr = String(r.month ?? "").slice(0, 4);
      const cols = [
        (meta.current_page - 1) * 20 + (idx + 1),
        monthLabel(r.month),
        r.type,
        Number(r.amount ?? 0),
        divCache[yr] ?? 0,
      ];
      return cols.map(csvSafe).join(",");
    });
    const csv = [header, ...body].join("\n");
    downloadCsv(csv, `simpanan-halaman-${meta.current_page}.csv`);
  };

  const exportCsvAllPages = async () => {
    try {
      let allRows = [];
      const first = await api.get("/savings", {
        params: { ...queryParams, page: 1 },
      });
      const firstItems = Array.isArray(first.data)
        ? first.data
        : Array.isArray(first.data?.data)
        ? first.data.data
        : [];
      const last_page = first.data?.last_page ?? 1;
      allRows = allRows.concat(firstItems);

      if (last_page > 1) {
        const requests = [];
        for (let p = 2; p <= last_page; p++) {
          requests.push(
            api.get("/savings", { params: { ...queryParams, page: p } })
          );
        }
        const results = await Promise.allSettled(requests);
        results.forEach((res) => {
          if (res.status === "fulfilled") {
            const d = res.value.data;
            const items = Array.isArray(d)
              ? d
              : Array.isArray(d?.data)
              ? d.data
              : [];
            allRows = allRows.concat(items);
          }
        });
      }

      const header = ["No", "Bulan", "Jenis", "Jumlah"].join(",");
      const body = allRows.map((r, i) => {
        const cols = [
          i + 1,
          monthLabel(r.month),
          r.type,
          Number(r.amount ?? 0),
        ];
        return cols.map(csvSafe).join(",");
      });
      const csv = [header, ...body].join("\n");
      downloadCsv(csv, `simpanan-semua-halaman.csv`);
    } catch (e) {
      console.error(e);
      alert("Gagal export semua halaman.");
    }
  };

  // ===== Helpers CSV =====
  function csvSafe(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
      <h1 className="text-3xl font-bold mb-2">Tabel Data Simpanan Saya</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          type="month"
          className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          placeholder="Filter Bulan (YYYY-MM)"
        />
        <select
          className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Semua Jenis</option>
          <option value="wajib">Wajib</option>
          <option value="pokok">Pokok</option>
          <option value="sukarela">Sukarela</option>
        </select>

        <div className="flex items-center text-sm text-gray-500">
          {loading ? "Memuat..." : `Total: ${meta.total}`}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="btn btn-sm"
            onClick={exportCsvCurrentPage}
            disabled={rows.length === 0}
          >
            Export CSV (halaman ini)
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={exportCsvAllPages}
            disabled={meta.total === 0}
          >
            Export CSV (semua halaman)
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead className="bg-[#5bc0de] text-white text-center">
            <tr>
              <th></th>
              <th>Bulan</th>
              <th>Jenis Simpanan</th>
              <th>Besar Simpanan</th>
              <th>Total Bagi Hasil Tahunan</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  {loading ? "Memuat data..." : "Tidak ada data."}
                </td>
              </tr>
            )}

            {rows.map((r, idx) => {
              const yr = String(r.month ?? "").slice(0, 4);
              return (
                <tr key={r.id ?? `${idx}-${r.month}-${r.type}`}>
                  <th>{(meta.current_page - 1) * 20 + (idx + 1)}</th>
                  <td>{monthLabel(r.month)}</td>
                  <td className="capitalize">{r.type}</td>
                  <td>{formatIDR(Number(r.amount ?? 0))}</td>
                  <td>{dividendForYear(yr)}</td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={5}>
                <div className="flex items-center justify-between py-2">
                  <button
                    className="btn btn-sm"
                    disabled={meta.current_page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <div className="text-sm text-gray-600">
                    Page {meta.current_page} / {meta.last_page}
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={meta.current_page >= meta.last_page || loading}
                    onClick={() =>
                      setPage((p) => Math.min(meta.last_page, p + 1))
                    }
                  >
                    Next →
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
