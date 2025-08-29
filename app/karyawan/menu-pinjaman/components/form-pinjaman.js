"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/axios";

export default function FormPinjaman() {
  const Router = useRouter();

  const [submittedAt, setSubmittedAt] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    setSubmittedAt(`${y}-${m}-${d}`);
  }, []);
  useEffect(() => {
    let alive = true;
    api
      .get("/me")
      .then(({ data }) => {
        if (!alive) return;
        setName(data?.name || "");
      })
      .catch(() => {
        setName("");
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);

    try {
      const payload = {
        amount,
        submitted_at: submittedAt ? `${submittedAt} 00:00:00` : undefined,
        phone,
        address,
      };

      await api.post("/loans", payload);
      Router.push("/karyawan");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal mengajukan pinjaman";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
        <h1 className="text-3xl font-bold bg-[#5bc0de] px-3 py-2 rounded text-white text-center mb-10">
          Formulir Pengajuan Pinjaman
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="date"
            placeholder="Tanggal Pengajuan"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nama Karyawan"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={name}
            readOnly
          />
          <input
            type="text"
            placeholder="Besar Pinjaman"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nomor Telepon"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="text"
            placeholder="Alamat"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {errMsg && <p className="text-red-600 text-sm pt-2">{errMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5bc0de] text-white py-2 rounded-md mt-4 hover:bg-[#5bc0de]/80 uppercase font-bold  hover:text-black transition disabled:opacity-70"
          >
            {loading ? "Memproses..." : "Ajukan Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
