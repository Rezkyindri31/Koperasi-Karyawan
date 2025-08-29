// /apps/frontend/src/hooks/useAuth.js
"use client";

import { useState } from "react";
import { api } from "@/src/lib/axios";

export function useAuth() {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const me = async () => {
    const { data } = await api.get("/me");
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (_) {}
    localStorage.removeItem("token");
    setUser(null);
  };

  return { user, login, me, logout };
}
