"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import { MenuItem, TextField } from "@mui/material";

type UserForm = {
  username: string;
  password: string;
  cid: string;
  prefix: string;
  firstname: string;
  lastname: string;
  role: "user" | "admin";
  active: boolean;
};

export default function EditUser() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<UserForm>({
    username: "",
    password: "",
    cid: "",
    prefix: "",
    firstname: "",
    lastname: "",
    role: "user",
    active: true,
  });

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/${id}`);
      const u = res.data;

      setForm({
        username: u.username || "",
        password: "",
        cid: u.cid || "",
        prefix: u.prefix || "",
        firstname: u.firstname || "",
        lastname: u.lastname || "",
        role: u.role || "user",
        active: Boolean(u.active),
      });
    } catch (err) {
      console.error(err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCidChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 13);
    setForm((prev) => ({ ...prev, cid: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (form.cid && form.cid.length !== 13) {
      toast.error("เลขบัตรประชาชนต้องเป็นเลข 13 หลัก");
      return;
    }

    try {
      setSaving(true);
      await axios.put(`/api/users/${id}`, form);
      toast.success("บันทึกสำเร็จ 🎉");
      router.push("/admin/users");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ ❌");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-lg shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
            กำลังโหลดข้อมูลผู้ใช้...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          กลับหน้ารายชื่อผู้ใช้
        </button>

        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/70 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="relative overflow-hidden bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-10 dark:from-blue-700 dark:via-indigo-800 dark:to-violet-800">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-16 h-44 w-44 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <UserRound className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    User Management
                  </p>
                  <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                    แก้ไขข้อมูลผู้ใช้
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    ปรับปรุงข้อมูลบัญชี สิทธิ์การใช้งาน และสถานะผู้ใช้
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur md:self-auto">
                <BadgeCheck size={16} />
                {form.active ? "บัญชีเปิดใช้งาน" : "บัญชีถูกปิดใช้งาน"}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 p-6 md:p-10">
            <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 transition-colors md:p-6 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <UserRound size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    ข้อมูลบัญชี
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Username และรหัสผ่านสำหรับเข้าสู่ระบบ
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Username
                  </label>
                  <input
                    value={form.username}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Password
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      เว้นว่างหากไม่ต้องการเปลี่ยน
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 my-auto flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      aria-label={
                        showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-colors md:p-6 dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <BadgeCheck size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    ข้อมูลส่วนตัว
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    ชื่อ นามสกุล และเลขบัตรประชาชน
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-12">
                <div className="md:col-span-12">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    เลขบัตรประชาชน
                  </label>
                  <input
                    name="cid"
                    value={form.cid}
                    onChange={handleCidChange}
                    placeholder="กรอกเลข 13 หลัก"
                    inputMode="numeric"
                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm tracking-widest text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                      form.cid.length > 0 && form.cid.length !== 13
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                    }`}
                  />
                  {form.cid.length > 0 && form.cid.length !== 13 && (
                    <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400">
                      ต้องเป็นตัวเลข 13 หลัก
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    คำนำหน้า
                  </label>
                  <select
                    name="prefix"
                    value={form.prefix}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  >
                    <option value="">-- เลือก --</option>
                    <option value="นาย">นาย</option>
                    <option value="น.ส.">น.ส.</option>
                    <option value="นาง">นาง</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    ชื่อ
                  </label>
                  <input
                    name="firstname"
                    value={form.firstname}
                    onChange={handleChange}
                    placeholder="ชื่อ"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    นามสกุล
                  </label>
                  <input
                    name="lastname"
                    value={form.lastname}
                    onChange={handleChange}
                    placeholder="นามสกุล"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 transition-colors md:p-6 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    สิทธิ์และสถานะ
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    กำหนด Role และการเปิดใช้งานบัญชี
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                        Active
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        เปิดหรือปิดการใช้งานบัญชีนี้
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      name="active"
                      checked={form.active}
                      onChange={handleChange}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-blue-400"
                    />
                  </label>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={() => router.push("/admin/users")}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:from-blue-500 dark:to-indigo-500 dark:shadow-blue-950/40"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
