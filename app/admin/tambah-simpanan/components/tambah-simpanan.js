"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";

export default function FormTambahSimpanan() {
  const router = useRouter();
  const [tanggal, setTanggal] = useState("");
  const [userId, setUserId] = useState("");
  const [wajib, setWajib] = useState("");
  const [pokok, setPokok] = useState("");
  const [dividend, setDividend] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);

  const parseMoney = (s) => {
    if (!s) return 0;
    const cleaned = String(s).replace(/[^\d.,-]/g, "");
    if (
      cleaned.includes(",") &&
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
    ) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      return Number(normalized) || 0;
    }
    const normalized = cleaned.replace(/,/g, "");
    return Number(normalized) || 0;
  };

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

  const year = useMemo(
    () => (tanggal ? Number(tanggal.slice(0, 4)) : null),
    [tanggal]
  );

  useEffect(() => {
    let alive = true;
    if (!userId || !year) {
      setDividend("");
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/dividend", {
          params: { year, user_id: userId },
        });
        if (alive) setDividend(formatIDR(Number(data?.dividend ?? 0)));
      } catch {
        if (alive) setDividend("");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, year]);

  const onSave = async () => {
    if (!userId) return alert("Pilih karyawan dulu.");
    if (!tanggal) return alert("Isi tanggal dulu.");

    const amountWajib = parseMoney(wajib);
    const amountPokok = parseMoney(pokok);
    if (amountWajib <= 0 && amountPokok <= 0) {
      return alert(
        "Isi nominal simpanan wajib atau pokok (salah satu / keduanya)."
      );
    }

    try {
      setSaving(true);
      const reqs = [];

      // ⬇ Kirim month (bukan date)
      if (amountWajib > 0) {
        reqs.push(
          api.post("/savings", {
            user_id: userId,
            type: "wajib",
            month: tanggal,
            amount: amountWajib,
          })
        );
      }
      if (amountPokok > 0) {
        reqs.push(
          api.post("/savings", {
            user_id: userId,
            type: "pokok",
            month: tanggal,
            amount: amountPokok,
          })
        );
      }

      await Promise.all(reqs);
      alert("Simpanan berhasil disimpan.");
      router.push("/admin");
    } catch (e) {
      const data = e?.response?.data;
      if (data?.errors) {
        const firstKey = Object.keys(data.errors)[0];
        alert(data.errors[firstKey]?.[0] || "Gagal menyimpan.");
      } else {
        alert(data?.message || "Gagal menyimpan.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
        <h1 className="text-3xl font-bold bg-[#5bc0de] px-3 py-2 rounded text-white text-center mb-10">
          Formulir Tambah Simpanan Karyawan
        </h1>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <input
            type="date"
            placeholder="Tanggal Pengajuan"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />

          <select
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="" disabled>
              Pilih Karyawan
            </option>
            {users.length > 0 ? (
              users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))
            ) : (
              <option value="" disabled>
                Kosong
              </option>
            )}
          </select>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Nominal Simpanan Wajib"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={wajib}
            onChange={(e) => setWajib(e.target.value)}
          />

          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Nominal Simpanan Pokok"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={pokok}
            onChange={(e) => setPokok(e.target.value)}
          />

          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Total Bagi Hasil Tahunan"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={dividend}
            readOnly
          />
        </form>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-[#5bc0de] text-white py-2 rounded-md mt-4 hover:bg-[#5bc0de]/80 uppercase font-bold  hover:text-black transition disabled:opacity-70"
        >
          {saving ? "Menyimpan..." : "Simpan Data"}
        </button>
      </div>
    </div>
  );
}
