"use client";

import Input from "@/components/ui/input/Input";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function SignInForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  // 🔥 กัน back button (สำคัญมาก)
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    window.onpopstate = function () {
      router.replace("/dashboard");
    };

    return () => {
      window.onpopstate = null;
    };
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (!form.username || !form.password) {
      toast.error("กรอกข้อมูลให้ครบ");
      return;
    }

    try {
      setLoading(true);

      // 🔥 สำคัญ: withCredentials (กรณีใช้ cookie)
      const res = await axios.post("/api/auth/login", form, {
        withCredentials: true,
      });

      const user = res.data?.user;

      if (!user) {
        toast.error("ไม่พบข้อมูลผู้ใช้");
        return;
      }

      toast.success("เข้าสู่ระบบสำเร็จ", {
        autoClose: 800,
      });

      const redirectUrl =
        user.role === "admin" ? "/admin/dashboard" : "/user/dashboard";

      // 🔥 delay นิดให้ cookie set ทัน
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 300);
    } catch (error: any) {
      const msg = error.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ระบบติดตามการสรุปเวชระเบียนผู้ป่วยใน โรงพยาบาลยางตลาด
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="relative mt-2">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                  👤
                </span>

                <Input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  type="text"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-12 pl-10 text-gray-800 shadow-sm transition-all duration-200 placeholder:text-gray-400 hover:shadow-md focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              {/* password */}
              <div className="relative mt-2">
                {/* lock icon */}
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                  🔒
                </span>

                <Input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-12 pl-10 text-gray-800 shadow-sm transition-all duration-200 placeholder:text-gray-400 hover:shadow-md focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900"
                />

                {/* toggle eye */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              </div>

              {/* submit */}
              <div className="mt-10">
                <Button
                  className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      กำลังเข้าสู่ระบบ...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
