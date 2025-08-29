"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";

export default function TablePelunasan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // ==== FILTERS ====
  const [statusFilter, setStatusFilter] = useState("submitted"); // submitted | approved | rejected | ""
  const [monthFilter, setMonthFilter] = useState(""); // YYYY-MM

  // ==== CSV ====
  const [downloadingAll, setDownloadingAll] = useState(false);

  // ===== preview bukti (pakai blob)
  const [isProofOpen, setIsProofOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState(null);

  // modal konfirmasi approve/reject
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

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
    if (isNaN(d.getTime())) return String(ts).split?.(" ")?.[0] || String(ts);
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
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
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

  const badgeForStatus = (s) =>
    s === "approved"
      ? "badge badge-success"
      : s === "rejected"
      ? "badge badge-error"
      : "badge";

  const normalizePagination = (data, fallbackPage) => {
    const items = Array.isArray(data) ? data : data?.data || [];
    const classic = data?.current_page != null;
    const m = classic
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
          current_page: data?.meta?.current_page ?? fallbackPage,
          last_page: data?.meta?.last_page ?? 1,
          total: data?.meta?.total ?? items?.length ?? 0,
          from: data?.meta?.from ?? 1,
          to: data?.meta?.to ?? items?.length ?? 0,
          prev_page_url: data?.links?.prev ?? null,
          next_page_url: data?.links?.next ?? null,
        };
    return { items, meta: m };
  };

  const fetchRows = async (pageNum = 1) => {
    setLoading(true);
    setErr(null);
    try {
      const params = { page: pageNum };
      if (statusFilter) params.status = statusFilter; // submitted|approved|rejected
      if (monthFilter) params.month = monthFilter; // YYYY-MM (paid_at)

      const { data } = await api.get("/settlements", { params });
      const { items, meta } = normalizePagination(data, pageNum);
      setRows(items);
      setMeta(meta);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Gagal memuat data pelunasan"
      );
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto fetch saat page / filter berubah
  useEffect(() => {
    fetchRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, monthFilter]);

  // ===== Client-side filter fallback (kalau backend belum dukung month) =====
  const displayedRows = useMemo(() => {
    if (!statusFilter && !monthFilter) return rows;
    return rows.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (monthFilter && getMonthKey(s.paid_at) !== monthFilter) return false;
      return true;
    });
  }, [rows, statusFilter, monthFilter]);

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

  const toCSV = (list) => {
    const header = [
      "Settlement ID",
      "Tanggal Bayar",
      "Status",
      "Loan ID",
      "Nama Karyawan",
      "Jumlah Pinjaman (IDR)",
      "Ada Bukti",
    ];
    const body = list.map((r) => [
      csvEscape(r?.id ?? ""),
      csvEscape(isoTanggal(r?.paid_at)),
      csvEscape(r?.status ?? ""),
      csvEscape(r?.loan?.id ?? ""),
      csvEscape(r?.loan?.user?.name || r?.user?.name || ""),
      csvEscape(r?.loan?.amount ?? r?.amount ?? ""),
      csvEscape(r?.proof_path || r?.proof_url ? "ya" : "tidak"),
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
    const csv = toCSV(displayedRows);
    const suffix =
      (monthFilter ? `_${monthFilter}` : "") +
      (statusFilter ? `_${statusFilter}` : "");
    downloadBlob(
      csv,
      `pelunasan_page${meta?.current_page ?? page}${suffix}.csv`
    );
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

        const { data } = await api.get("/settlements", { params });
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

      // Client-side guard (jika server belum filter month)
      let exportRows = all;
      if (anyFilterActive) {
        exportRows = all.filter((s) => {
          if (statusFilter && s.status !== statusFilter) return false;
          if (monthFilter && getMonthKey(s.paid_at) !== monthFilter)
            return false;
          return true;
        });
      }

      const csv = toCSV(exportRows);
      const suffix =
        (monthFilter ? `_${monthFilter}` : "") +
        (statusFilter ? `_${statusFilter}` : "");
      downloadBlob(csv, `pelunasan_semua${suffix}.csv`);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Gagal mengunduh CSV");
    } finally {
      setDownloadingAll(false);
    }
  };

  // ====== Modal Lihat Bukti (pakai blob) ======
  const openProof = async (s) => {
    setSelected(s);
    setIsProofOpen(true);
    setPreviewLoading(true);
    setPreviewErr(null);
    // bersihkan object URL lama
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setPreviewMime("");

    try {
      const res = await api.get(`/settlements/${s.id}/proof`, {
        responseType: "blob",
      });
      const mime = res.headers?.["content-type"] || "";
      const url = URL.createObjectURL(res.data);
      setPreviewMime(mime);
      setPreviewUrl(url);
    } catch (e) {
      setPreviewErr(
        e?.response?.data?.message || e?.message || "Gagal memuat bukti."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeProof = () => {
    setIsProofOpen(false);
    setSelected(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewMime("");
    setPreviewErr(null);
    setPreviewLoading(false);
  };

  const openConfirm = (s, t) => {
    setSelected(s);
    setActionType(t);
    setSubmitErr(null);
    setIsConfirmOpen(true);
  };
  const closeConfirm = () => {
    setIsConfirmOpen(false);
    setSelected(null);
    setActionType(null);
    setSubmitErr(null);
  };

  const onConfirm = async () => {
    if (!selected || !actionType) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      if (actionType === "approve") {
        await api.post(`/settlements/${selected.id}/approve`);
      } else {
        await api.post(`/settlements/${selected.id}/reject`);
      }
      closeConfirm();
      fetchRows(page);
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

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
      <h1 className="text-3xl font-bold mb-2">Tabel Data Pelunasan</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          type="month"
          className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
          value={monthFilter}
          onChange={(e) => {
            setPage(1);
            setMonthFilter(e.target.value);
          }}
          placeholder="Filter Bulan (YYYY-MM)"
        />

        {/* Status */}
        <select
          className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">Semua Status</option>
          <option value="submitted">Menunggu Review</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>

        <div className="flex items-center text-sm text-gray-500">
          {loading
            ? "Memuat..."
            : `Total: ${meta?.total ?? displayedRows.length ?? 0}`}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={handleDownloadCurrent}
            disabled={loading || displayedRows.length === 0}
            title="Unduh data yang sedang ditampilkan"
          >
            Unduh CSV (Halaman ini)
          </button>
          <button
            className={`btn btn-sm ${downloadingAll ? "loading" : ""}`}
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            title="Unduh seluruh data dari semua halaman"
          >
            {downloadingAll ? "Menyiapkan…" : "Unduh CSV (Semua)"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead className="bg-[#5bc0de] text-white text-center">
            <tr>
              <th></th>
              <th>Tanggal Pelunasan</th>
              <th>Nama Karyawan</th>
              <th>Besar Pinjaman</th>
              <th>Bukti Transfer</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-6 text-center">Memuat data…</div>
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-6 text-center text-error">{err}</div>
                </td>
              </tr>
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="py-6 text-center opacity-60">
                    Tidak ada data.
                  </div>
                </td>
              </tr>
            ) : (
              displayedRows.map((s, idx) => (
                <tr key={s.id ?? idx}>
                  <th>{meta ? (meta.from ?? 1) + idx : idx + 1}</th>
                  <td>{formatTanggal(s.paid_at)}</td>
                  <td>{s?.loan?.user?.name || s?.user?.name || "-"}</td>
                  <td>{formatRupiah(s?.loan?.amount ?? s?.amount ?? 0)}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => openProof(s)}
                      disabled={!s?.proof_path && !s?.proof_url}
                    >
                      Lihat Bukti
                    </button>
                  </td>
                  <td>
                    <span className={badgeForStatus(s.status)}>{s.status}</span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => openConfirm(s, "approve")}
                      disabled={s.status !== "submitted"}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => openConfirm(s, "reject")}
                      disabled={s.status !== "submitted"}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {meta && (
            <tfoot>
              <tr>
                <td colSpan={7}>
                  <div className="flex items-center justify-between py-2">
                    <div className="text-sm opacity-70">
                      {anyFilterActive ? (
                        <>Menampilkan {displayedRows.length} data (tersaring)</>
                      ) : (
                        <>
                          Menampilkan {meta.from}–{meta.to} dari {meta.total}{" "}
                          data
                        </>
                      )}
                    </div>
                    <div className="join">
                      <button
                        className="join-item btn btn-sm"
                        disabled={!meta.prev_page_url || page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        «
                      </button>
                      <button className="join-item btn btn-sm">
                        Hal. {meta.current_page ?? page}
                      </button>
                      <button
                        className="join-item btn btn-sm"
                        disabled={
                          !meta.next_page_url ||
                          (meta.current_page ?? page) >= meta.last_page ||
                          loading
                        }
                        onClick={() =>
                          setPage((p) => Math.min(meta.last_page, p + 1))
                        }
                      >
                        »
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <input
        type="checkbox"
        className="modal-toggle"
        checked={isProofOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-lg mb-2">Bukti Pembayaran</h3>

          {selected && (
            <div className="mb-3 text-sm opacity-80">
              <div>
                Nama:{" "}
                {selected?.loan?.user?.name || selected?.user?.name || "-"}
              </div>
              <div>
                Jumlah Pinjaman: {formatRupiah(selected?.loan?.amount ?? 0)}
              </div>
              <div>Tanggal Bayar: {formatTanggal(selected?.paid_at)}</div>
            </div>
          )}

          {previewLoading && (
            <div className="py-6 text-center">Memuat bukti…</div>
          )}

          {previewErr && <p className="text-sm text-error">{previewErr}</p>}

          {!previewLoading &&
            !previewErr &&
            previewUrl &&
            (previewMime.toLowerCase().includes("pdf") ? (
              <a
                className="link link-primary"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Buka PDF di tab baru
              </a>
            ) : (
              <img
                src={previewUrl}
                alt="Bukti pembayaran"
                className="rounded-lg border max-h-[65vh] object-contain"
              />
            ))}

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={closeProof}>
              Tutup
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={closeProof} />
      </div>

      <input
        type="checkbox"
        className="modal-toggle"
        checked={isConfirmOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">
            {actionType === "approve" ? "Setujui Pelunasan" : "Tolak Pelunasan"}
          </h3>

          {selected && (
            <div className="space-y-1 text-sm opacity-80">
              <div>
                Settlement ID: <span className="font-mono">{selected.id}</span>
              </div>
              <div>
                Nama:{" "}
                {selected?.loan?.user?.name || selected?.user?.name || "-"}
              </div>
              <div>
                Jumlah Pinjaman: {formatRupiah(selected?.loan?.amount ?? 0)}
              </div>
              <div>Tanggal Bayar: {formatTanggal(selected?.paid_at)}</div>
            </div>
          )}

          {submitErr && <p className="text-sm text-error mt-3">{submitErr}</p>}

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={closeConfirm}
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
        <div className="modal-backdrop" onClick={closeConfirm} />
      </div>
    </div>
  );
}
