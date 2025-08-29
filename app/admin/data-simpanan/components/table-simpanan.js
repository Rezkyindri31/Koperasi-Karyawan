"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/src/lib/axios";

export default function TableSimpanan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [users, setUsers] = useState([]);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [divCache, setDivCache] = useState({});

  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);

  const [editingRow, setEditingRow] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("");

  const [deletingRow, setDeletingRow] = useState(null);

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatIDR = (n) =>
    isFinite(n)
      ? n.toLocaleString("id-ID", { style: "currency", currency: "IDR" })
      : "";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/users", {
          params: { role: "karyawan" },
        });
        if (alive && Array.isArray(data)) setUsers(data);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const queryParams = useMemo(() => {
    const p = { page };
    if (filterMonth) p.month = filterMonth;
    if (filterType) p.type = filterType;
    if (filterUserId) p.user_id = filterUserId;
    return p;
  }, [page, filterMonth, filterType, filterUserId]);

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
  }, [
    queryParams.page,
    queryParams.month,
    queryParams.type,
    queryParams.user_id,
  ]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const pairs = new Set();
      rows.forEach((r) => {
        if (!r?.user_id || !r?.month) return;
        const year = String(r.month).slice(0, 4);
        if (/^\d{4}$/.test(year)) pairs.add(`${r.user_id}-${year}`);
      });

      const jobs = [];
      pairs.forEach((key) => {
        if (divCache[key] == null) {
          const [uid, yr] = key.split("-");
          jobs.push({ uid, yr, key });
        }
      });
      if (jobs.length === 0) return;

      try {
        const results = await Promise.allSettled(
          jobs.map(({ uid, yr }) =>
            api.get("/dividend", { params: { user_id: uid, year: Number(yr) } })
          )
        );
        const next = { ...divCache };
        results.forEach((res, i) => {
          const { key } = jobs[i];
          next[key] =
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

  const openEdit = (row) => {
    setEditingRow(row);
    setEditAmount(row.amount);
    setEditType(row.type);
    editModalRef.current?.showModal();
  };

  const closeEdit = () => {
    setEditingRow(null);
    setEditAmount("");
    setEditType("");
    editModalRef.current?.close();
  };

  const handleUpdate = async () => {
    if (!editingRow) return;

    const amountNum = Number(String(editAmount).replace(/[^\d.-]/g, ""));
    if (!isFinite(amountNum) || amountNum < 1) {
      return alert("Nominal tidak valid (minimal 1).");
    }
    if (!["wajib", "pokok", "sukarela"].includes(String(editType))) {
      return alert("Jenis harus: wajib/pokok/sukarela.");
    }

    try {
      setUpdating(true);
      await api.put(`/savings/${editingRow.id}`, {
        amount: amountNum,
        type: editType,
      });

      setRows((prev) =>
        prev.map((r) =>
          r.id === editingRow.id
            ? { ...r, amount: amountNum, type: editType }
            : r
        )
      );

      closeEdit();
      alert("Berhasil diupdate.");
    } catch (e) {
      const resp = e?.response?.data;
      if (resp?.errors) {
        const firstKey = Object.keys(resp.errors)[0];
        alert(resp.errors[firstKey]?.[0] || "Gagal mengubah data.");
      } else {
        alert(resp?.message || "Gagal mengubah data.");
      }
    } finally {
      setUpdating(false);
    }
  };

  const openDelete = (row) => {
    setDeletingRow(row);
    deleteModalRef.current?.showModal();
  };

  const closeDelete = () => {
    setDeletingRow(null);
    deleteModalRef.current?.close();
  };

  const handleDelete = async () => {
    if (!deletingRow) return;
    try {
      setDeleting(true);
      await api.delete(`/savings/${deletingRow.id}`);
      setRows((prev) => prev.filter((r) => r.id !== deletingRow.id));
      setMeta((m) => ({ ...m, total: Math.max(0, (m.total || 1) - 1) }));
      closeDelete();
      alert("Berhasil dihapus.");
    } catch (e) {
      alert(e?.response?.data?.message || "Gagal menghapus.");
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const monthLabel = (val) => (val ? String(val).slice(0, 7) : "");
  const currentYearFor = (row) => String(row?.month ?? "").slice(0, 4);
  const dividendFor = (row) => {
    const year = currentYearFor(row);
    const key = `${row.user_id}-${year}`;
    const val = divCache[key];
    return val == null ? "…" : formatIDR(val);
  };

  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterType, filterUserId]);

  return (
    <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
      <h1 className="text-3xl font-bold mb-2">Tabel Data Simpanan Karyawan</h1>

      {/* Filter bar */}
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
        <select
          className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
        >
          <option value="">Semua Karyawan</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="flex items-center text-sm text-gray-500">
          {loading ? "Memuat..." : `Total: ${meta.total}`}
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
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  {loading ? "Memuat data..." : "Tidak ada data."}
                </td>
              </tr>
            )}

            {rows.map((r, idx) => (
              <tr key={r.id}>
                <th>{(meta.current_page - 1) * 20 + (idx + 1)}</th>
                <td>{monthLabel(r.month)}</td>
                <td className="capitalize">{r.type}</td>
                <td>{formatIDR(Number(r.amount ?? 0))}</td>
                <td>{dividendFor(r)}</td>
                <td className="space-x-2">
                  <button
                    className="btn btn-warning btn-sm text-white"
                    onClick={() => openEdit(r)}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-error btn-sm text-white"
                    onClick={() => openDelete(r)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>
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
      <dialog className="modal" ref={editModalRef}>
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={closeEdit}
            >
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4">Update Simpanan</h3>

          <div className="form-control w-full mb-3">
            <label className="label">
              <span className="label-text">Nominal</span>
            </label>
            <input
              type="number"
              min="1"
              className="input input-bordered w-full"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Jenis Simpanan</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
            >
              <option value="wajib">Wajib</option>
              <option value="pokok">Pokok</option>
              <option value="sukarela">Sukarela</option>
            </select>
          </div>

          <div className="modal-action">
            <button className="btn" onClick={closeEdit} disabled={updating}>
              Batal
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeEdit}>close</button>
        </form>
      </dialog>
      <dialog className="modal" ref={deleteModalRef}>
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={closeDelete}
            >
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg">Hapus Data</h3>
          <p className="py-4">
            Yakin ingin menghapus data simpanan{" "}
            <span className="font-semibold">
              {deletingRow
                ? `${monthLabel(deletingRow.month)} • ${deletingRow.type}`
                : ""}
            </span>
            ?
          </p>
          <div className="modal-action">
            <button className="btn" onClick={closeDelete} disabled={deleting}>
              Batal
            </button>
            <button
              className="btn btn-error text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeDelete}>close</button>
        </form>
      </dialog>
    </div>
  );
}
