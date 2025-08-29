"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { api } from "@/src/lib/axios";
import Image from "next/image";

export default function AdminSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name || name.trim().length < 3) e.name = "Nama minimal 3 karakter";
    if (!emailLocal || !/^[a-zA-Z0-9._%+-]+$/.test(emailLocal))
      e.emailLocal = "Isi bagian sebelum '@' (huruf/angka/titik/garis)";
    if (!password || password.length < 8)
      e.password = "Password minimal 8 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    try {
      const local = emailLocal.replace(/@.*$/, "");
      const email = `${local}@koperasi.com`;

      await api.post("/admin/register", {
        name,
        email,
        password,
      });

      router.replace("/admin/sign-in");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        const serverErrors = {};
        Object.entries(data.errors).forEach(([field, msgs]) => {
          const first = Array.isArray(msgs) ? msgs[0] : String(msgs);
          const key = field === "email" ? "emailLocal" : field;
          serverErrors[key] = first;
        });
        setErrors(serverErrors);
      } else {
        setErrors({ general: data?.message || "Pendaftaran admin gagal." });
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">
        <h1 className="text-3xl font-bold mb-2">
          Buat Akun Admin Koperasi Karyawan Kita
        </h1>
        <p className="text-gray-500 mb-6">
          Daftarkan diri Anda sebagai Administrator.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <input
              type="text"
              placeholder="Masukkan Nama Anda"
              className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center py-2">
              <input
                type="text"
                placeholder="Email (tanpa @)"
                className="flex-1 border-b border-gray-300 py-2 pr-10 focus:outline-none focus:border-blue-500"
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
              />
              <span className="ml-2 text-gray-500">@koperasi.com</span>
            </div>
            {errors.emailLocal && (
              <p className="text-sm text-red-600 mt-1">{errors.emailLocal}</p>
            )}
          </div>

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border-b border-gray-300 py-2 pr-10 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 text-gray-500"
            >
              {showPassword ? (
                <IoEyeOffOutline size={20} />
              ) : (
                <IoEyeOutline size={20} />
              )}
            </button>
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {errors.general && (
            <p className="text-sm text-red-600">{errors.general}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md mt-4 hover:bg-blue-700 transition"
          >
            Buat Akun
          </button>
        </form>

        <button
          onClick={() => router.push("/admin/sign-in")}
          className="mt-4 w-full border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          Sudah Punya Akun? Silahkan Masuk
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
