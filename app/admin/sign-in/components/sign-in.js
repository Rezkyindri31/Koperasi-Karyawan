"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { api } from "@/src/lib/axios";
import Image from "next/image";

export default function AdminSignInPage() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!emailInput || !password) {
      setErr("Email dan password wajib diisi.");
      return;
    }

    // auto-append domain kalau user hanya isi local-part
    const raw = emailInput.trim();
    const email = raw.includes("@") ? raw : `${raw}@koperasi.com`;

    try {
      setLoading(true);
      const { data } = await api.post("/login", { email, password });

      // simpan token
      localStorage.setItem("token", data.token);

      // arahkan sesuai role
      const role = data?.user?.role;
      if (role === "admin") router.replace("/admin");
      else router.replace("/karyawan");
    } catch (error) {
      setErr(
        error?.response?.data?.message ||
          "Login gagal. Periksa kredensial Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
        <h1 className="text-3xl font-bold mb-6">
          Masuk Akun Admin Koperasi Karyawan Kita
        </h1>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Masukkan Email Anda"
            className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan Password Anda"
              className="w-full border-b border-gray-300 py-2 pr-10 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 text-gray-500"
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
            >
              {showPassword ? (
                <IoEyeOffOutline size={20} />
              ) : (
                <IoEyeOutline size={20} />
              )}
            </button>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md mt-4 hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <button
          onClick={() => router.push("/admin/sign-up")}
          className="mt-4 w-full border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          Belum Punya Akun? Silahkan Daftarkan Diri Anda
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <Image
          src="/assets/bg-sign.jpg"
          alt="Background Sign"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
