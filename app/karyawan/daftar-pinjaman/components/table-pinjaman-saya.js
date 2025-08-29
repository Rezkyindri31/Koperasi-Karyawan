"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";

export default function TablePinjamanSaya() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const fetchLoans = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get("/loans", {
        params: { status: undefined },
      });
      const items = Array.isArray(data) ? data : data?.data || [];
      setLoans(items);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Gagal memuat daftar pinjaman"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

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
    if (isNaN(d.getTime())) {
      return ts.split(" ")[0] || ts;
    }
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
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

  const openUploadModal = (loan) => {
    setSelectedLoan(loan);
    setProofFile(null);
    setPayAmount("");
    setSubmitErr(null);
    setIsOpen(true);
  };

  const closeUploadModal = () => {
    setIsOpen(false);
    setSelectedLoan(null);
    setProofFile(null);
    setPayAmount("");
    setSubmitErr(null);
  };

  const onSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setSubmitting(true);
    setSubmitErr(null);
    try {
      const fd = new FormData();
      fd.append("loan_id", selectedLoan.id);
      if (payAmount) fd.append("amount", payAmount);
      if (proofFile) fd.append("proof", proofFile);

      await api.post("/settlements", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      closeUploadModal();
      fetchLoans();
    } catch (e) {
      setSubmitErr(
        e?.response?.data?.message ||
          e?.message ||
          "Gagal mengunggah bukti pembayaran"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
      <h1 className="text-3xl font-bold mb-2">Tabel Daftar Pinjaman Saya</h1>

      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead className="bg-[#5bc0de] text-white text-center">
            <tr>
              <th></th>
              <th>Tanggal Pengajuan</th>
              <th>Besar Pinjaman</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="py-6 text-center">Memuat data…</div>
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={5}>
                  <div className="py-6 text-center text-error">{err}</div>
                </td>
              </tr>
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="py-6 text-center opacity-60">
                    Belum ada pengajuan pinjaman.
                  </div>
                </td>
              </tr>
            ) : (
              loans.map((loan, idx) => (
                <tr key={loan.id ?? idx}>
                  <th>{idx + 1}</th>
                  <td>{formatTanggal(loan.submitted_at)}</td>
                  <td>{formatRupiah(loan.amount)}</td>
                  <td>
                    <span className={badgeForStatus(loan.status)}>
                      {loan.status}
                    </span>
                  </td>
                  <td>
                    {loan.status === "approved" ? (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openUploadModal(loan)}
                      >
                        Upload Bukti
                      </button>
                    ) : (
                      <button className="btn btn-sm" disabled>
                        Upload Bukti
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <input
        type="checkbox"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">Upload Bukti Pembayaran</h3>
          {selectedLoan && (
            <div className="mb-4 text-sm opacity-80">
              <div>
                Loan ID: <span className="font-mono">{selectedLoan.id}</span>
              </div>
              <div>Jumlah: {formatRupiah(selectedLoan.amount)}</div>
            </div>
          )}

          <form className="space-y-3" onSubmit={onSubmitProof}>
            <div>
              <label className="label">
                <span className="label-text">Nominal Bayar (opsional)</span>
              </label>
              <input
                type="text"
                placeholder="cth: 500000"
                className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">
                  Bukti Pembayaran (gambar/PDF)
                </span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            {submitErr && <p className="text-sm text-error">{submitErr}</p>}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeUploadModal}
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${submitting ? "loading" : ""}`}
                disabled={submitting || !proofFile}
              >
                {submitting ? "Mengunggah..." : "Kirim Bukti"}
              </button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop" onClick={closeUploadModal} />
      </div>
    </div>
  );
}
