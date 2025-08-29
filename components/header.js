"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { IoPersonSharp } from "react-icons/io5";
import { api } from "@/src/lib/axios";
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const Router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [role, setRole] = useState(null);
  useEffect(() => {
    let alive = true;
    api
      .get("/me")
      .then(({ data }) => {
        if (!alive) return;
        setName(data?.name || "");
        setRole(data?.role || null);
      })
      .catch(() => {
        setName("");
        setRole(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const go = (href) => {
    Router.push(href);
    setIsOpen(false);
  };

  const isActive = (href) =>
    pathname === href || (pathname && pathname.startsWith(href + "/"));

  const onLogout = async () => {
    const savedUserRaw =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const savedRole = savedUserRaw
      ? (() => {
          try {
            return JSON.parse(savedUserRaw)?.role;
          } catch {
            return null;
          }
        })()
      : null;

    try {
      await api.post("/logout");
    } catch {}

    localStorage.removeItem("token");
    const isAdminPath = pathname?.startsWith("/admin");
    const to =
      savedRole === "admin" || isAdminPath
        ? "/admin/sign-in"
        : "/karyawan/sign-in";

    Router.replace(to);
  };

  return (
    <div className="navbar bg-[#5bc0de] shadow-sm">
      <div className="flex-none mr-5">
        <div className="drawer">
          <input
            type="checkbox"
            className="drawer-toggle"
            checked={isOpen}
            readOnly
          />
          <div className="drawer-content">
            <button
              className="btn btn-square btn-ghost hover:bg-transparent hover:border-2 hover:border-white"
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block h-5 w-5"
                stroke="white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <div className="drawer-side">
            <label
              htmlFor="my-drawer"
              aria-label="close sidebar"
              className="drawer-overlay"
              onClick={() => setIsOpen(false)}
            ></label>
            <ul className="menu bg-[#414a62] min-h-full w-80 p-4 text-white">
              <li className="menu-title text-white text-xl font-bold mb-5">
                {role
                  ? role === "admin"
                    ? "Menu Pilihan Admin"
                    : "Menu Pilihan Karyawan"
                  : "Memuat menu…"}
              </li>
              {role === "karyawan" && (
                <>
                  <li className="text-lg font-semibold">
                    <Link
                      className={isActive("/karyawan") ? "active" : ""}
                      href="/karyawan"
                      onClick={() => setIsOpen(false)}
                    >
                      Beranda
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/karyawan/menu-pinjaman") ? "active" : ""
                      }
                      href="/karyawan/menu-pinjaman"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Pinjaman
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/karyawan/daftar-pinjaman") ? "active" : ""
                      }
                      href="/karyawan/daftar-pinjaman"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Daftar Pinjaman
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/karyawan/daftar-simpanan") ? "active" : ""
                      }
                      href="/karyawan/daftar-simpanan"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Daftar Simpanan
                    </Link>
                  </li>
                </>
              )}
              {role === "admin" && (
                <>
                  <li className="text-lg font-semibold">
                    <Link
                      className={isActive("/admin") ? "active" : ""}
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                    >
                      Beranda
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/admin/data-pinjaman") ? "active" : ""
                      }
                      href="/admin/data-pinjaman"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Data Pinjaman
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/admin/data-pelunasan") ? "active" : ""
                      }
                      href="/admin/data-pelunasan"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Data Pelunasan
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/admin/data-simpanan") ? "active" : ""
                      }
                      href="/admin/data-simpanan"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Daftar Simpanan
                    </Link>
                  </li>
                  <li className="text-lg font-semibold">
                    <Link
                      className={
                        isActive("/admin/tambah-simpanan") ? "active" : ""
                      }
                      href="/admin/tambah-simpanan"
                      onClick={() => setIsOpen(false)}
                    >
                      Menu Tambah Simpanan
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xl font-extrabold uppercase text-white">
          Koperasi Karyawan Kita
        </p>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end ">
          <div
            tabIndex={0}
            role="button"
            className="btn m-1 flex items-center gap-2 rounded-3xl"
          >
            <IoPersonSharp className="text-lg uppercase" />
            {name || "Memuat..."}
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
          >
            <li onClick={onLogout}>
              <a>Logout</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
