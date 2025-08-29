"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";

export default function TabelPinjaman() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // pagination dari Laravel (opsional)
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // modal
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Unduh semua indikator
  const [downloadingAll, setDownloadingAll] = useState(false);

  const fetchLoans = async (pageNum = 1) => {
    setLoading(true);
    setErr(null);
    try {
      const params = { page: pageNum };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = monthFilter;

      const { data } = await api.get("/loans", { params });

      const items = Array.isArray(data) ? data : data?.data || [];

      const classic = data?.current_page != null;
      const metaNormalized = classic
        ? {
            current_page: data.current_page,
            last_page: data.last_page,
            total: data.total,
            from: data.from,
            to: data.to,
            prev_page_url: data.prev_page_url,
            next_page_url: data.next_page_url,
          }
        : {
            current_page: data?.meta?.current_page ?? pageNum,
            last_page: data?.meta?.last_page ?? 1,
            total: data?.meta?.total ?? items?.length ?? 0,
            from: data?.meta?.from ?? 1,
            to: data?.meta?.to ?? items?.length ?? 0,
            prev_page_url: data?.links?.prev ?? null,
            next_page_url: data?.links?.next ?? null,
          };

      setLoans(items);
      setMeta(metaNormalized);
    } catch (e) {
      setErr(
        e?.response?.data?.message || e?.message || "Gagal memuat data pinjaman"
      );
      setLoans([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans(page);
  }, [page]);

  const formatRupiah = (val) => {
    if (val == null || val === "") return "-";
    try {
      const num = typeof val === "string" ? Number(val) : val;
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return val;
    }
  };

  const formatTanggal = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).split(" ")[0] || String(ts);
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const isoTanggal = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toISOString().slice(0, 10);
  };

  const getMonthKey = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`; // YYYY-MM
    }
    return String(ts).slice(0, 7);
  };

  const badgeForStatus = (status) => {
    switch (status) {
      case "applied":
        return "badge badge-warning";
      case "approved":
        return "badge badge-info";
      case "rejected":
        return "badge badge-error";
      case "paid":
        return "badge badge-success";
      default:
        return "badge";
    }
  };

  const openModal = (loan, type) => {
    setSelectedLoan(loan);
    setActionType(type);
    setSubmitErr(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedLoan(null);
    setActionType(null);
    setSubmitErr(null);
  };

  const onConfirm = async () => {
    if (!selectedLoan || !actionType) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      if (actionType === "approve") {
        await api.post(`/loans/${selectedLoan.id}/approve`);
      } else {
        await api.post(`/loans/${selectedLoan.id}/reject`);
      }
      closeModal();
      fetchLoans(page);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (Array.isArray(e?.response?.data?.errors)
          ? e.response.data.errors.join(", ")
          : e?.message) ||
        "Gagal memperbarui status";
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedLoans = useMemo(() => {
    if (!statusFilter && !monthFilter) return loans;
    return loans.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (monthFilter) {
        const k = getMonthKey(l.submitted_at);
        if (k !== monthFilter) return false;
      }
      return true;
    });
  }, [loans, statusFilter, monthFilter]);

  const anyFilterActive = Boolean(statusFilter || monthFilter);

  // ===== CSV Export =====
  const csvEscape = (val) => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const toCSV = (rows) => {
    const header = [
      "ID",
      "Tanggal Pengajuan",
      "Nama Karyawan",
      "Besar Pinjaman (IDR)",
      "Nomor Telepon",
      "Alamat",
      "Status",
    ];
    const body = rows.map((r) => [
      csvEscape(r.id ?? ""),
      csvEscape(isoTanggal(r.submitted_at)),
      csvEscape(r?.user?.name ?? ""),
      csvEscape(r?.amount ?? ""),
      csvEscape(r?.phone_snapshot ?? ""),
      csvEscape(r?.address_snapshot ?? ""),
      csvEscape(r?.status ?? ""),
    ]);
    return [header, ...body].map((arr) => arr.join(",")).join("\n");
  };

  const downloadBlob = (
    content,
    filename,
    mime = "text/csv;charset=utf-8;"
  ) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCurrent = () => {
    const csv = toCSV(displayedLoans);
    const suffix =
      (monthFilter ? `_${monthFilter}` : "") +
      (statusFilter ? `_${statusFilter}` : "");
    downloadBlob(csv, `pinjaman_page${page}${suffix || ""}.csv`);
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      let all = [];
      let p = 1;
      let last = 1;

      do {
        const params = { page: p };
        if (statusFilter) params.status = statusFilter;
        if (monthFilter) params.month = monthFilter;

        const { data } = await api.get("/loans", { params });
        const items = Array.isArray(data) ? data : data?.data || [];
        all = all.concat(items);

        const classic = data?.current_page != null;
        if (classic) {
          last = data?.last_page ?? 1;
          p = (data?.current_page ?? p) + 1;
        } else {
          last = data?.meta?.last_page ?? 1;
          p = (data?.meta?.current_page ?? p) + 1;
        }
      } while (p <= last);

      // Client filter jaga-jaga
      let exportRows = all;
      if (statusFilter || monthFilter) {
        exportRows = all.filter((l) => {
          if (statusFilter && l.status !== statusFilter) return false;
          if (monthFilter && getMonthKey(l.submitted_at) !== monthFilter)
            return false;
          return true;
        });
      }

      const csv = toCSV(exportRows);
      const suffix =
        (monthFilter ? `_${monthFilter}` : "") +
        (statusFilter ? `_${statusFilter}` : "");
      downloadBlob(csv, `pinjaman_semua${suffix || ""}.csv`);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Gagal mengunduh CSV");
    } finally {
      setDownloadingAll(false);
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchLoans(1);
  };

  const resetFilters = () => {
    setStatusFilter("");
    setMonthFilter("");
    setPage(1);
    fetchLoans(1);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
      <h1 className="text-3xl font-bold mb-2">Tabel Data Pinjaman</h1>
      <div className="mb-4 rounded-box border border-base-content/10 bg-base-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            type="month"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            placeholder="Bulan (YYYY-MM)"
          />
          <select
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="applied">applied</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="paid">paid</option>
          </select>

          <div className="flex items-center text-sm text-gray-500">
            {loading ? "Memuat..." : `Total: ${meta?.total ?? 0}`}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-sm btn-primary" onClick={applyFilters}>
              Terapkan
            </button>
            <button className="btn btn-sm btn-ghost" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="opacity-70 text-sm">
            {anyFilterActive ? "Filter aktif" : "Tanpa filter"}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={handleDownloadCurrent}
              disabled={loading || displayedLoans.length === 0}
              title="Unduh data yang sedang ditampilkan"
            >
              Unduh CSV (Halaman ini)
            </button>
            <button
              className={`btn ${downloadingAll ? "loading" : ""}`}
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              title="Unduh seluruh data dari semua halaman"
            >
              {downloadingAll ? "Menyiapkan…" : "Unduh CSV (Semua)"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead className="bg-[#5bc0de] text-white text-center">
            <tr>
              <th></th>
              <th>Tanggal Pengajuan</th>
              <th>Nama Karyawan</th>
              <th>Besar Pinjaman</th>
              <th>Nomor Telepon</th>
              <th>Alamat</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="py-6 text-center">Memuat data…</div>
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={8}>
                  <div className="py-6 text-center text-error">{err}</div>
                </td>
              </tr>
            ) : displayedLoans.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="py-6 text-center opacity-60">
                    Belum ada data pinjaman.
                  </div>
                </td>
              </tr>
            ) : (
              displayedLoans.map((loan, idx) => (
                <tr key={loan.id ?? `${idx}`}>
                  <th>{meta ? (meta.from ?? 1) + idx : idx + 1}</th>
                  <td>{formatTanggal(loan.submitted_at)}</td>
                  <td>{loan?.user?.name || "-"}</td>
                  <td>{formatRupiah(loan.amount)}</td>
                  <td>{loan.phone_snapshot || "-"}</td>
                  <td
                    className="max-w-xs truncate"
                    title={loan.address_snapshot || "-"}
                  >
                    {loan.address_snapshot || "-"}
                  </td>
                  <td>
                    <span className={badgeForStatus(loan.status)}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => openModal(loan, "approve")}
                      disabled={loan.status !== "applied"}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => openModal(loan, "reject")}
                      disabled={loan.status !== "applied"}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm opacity-70">
            {anyFilterActive ? (
              <>Menampilkan {displayedLoans.length} data (tersaring)</>
            ) : (
              <>
                Menampilkan {meta.from}–{meta.to} dari {meta.total} data
              </>
            )}
          </div>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={!meta.prev_page_url || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              «
            </button>
            <button className="join-item btn btn-sm">Hal. {page}</button>
            <button
              className="join-item btn btn-sm"
              disabled={!meta.next_page_url || page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            >
              »
            </button>
          </div>
        </div>
      )}
      <input
        type="checkbox"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">
            {actionType === "approve" ? "Setujui Pinjaman" : "Tolak Pinjaman"}
          </h3>
          {selectedLoan && (
            <div className="space-y-1 text-sm opacity-80">
              <div>
                ID: <span className="font-mono">{selectedLoan.id}</span>
              </div>
              <div>Nama: {selectedLoan?.user?.name || "-"}</div>
              <div>Jumlah: {formatRupiah(selectedLoan.amount)}</div>
              <div>Tanggal: {formatTanggal(selectedLoan.submitted_at)}</div>
            </div>
          )}

          {submitErr && <p className="text-sm text-error mt-3">{submitErr}</p>}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeModal}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              className={`btn ${
                actionType === "approve" ? "btn-success" : "btn-error"
              } ${submitting ? "loading" : ""}`}
              onClick={onConfirm}
              disabled={submitting}
            >
              {submitting
                ? "Memproses..."
                : actionType === "approve"
                ? "Approve"
                : "Reject"}
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={closeModal} />
      </div>
    </div>
  );
}
