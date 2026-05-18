"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  IdCard,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type LoginUser = {
  id?: number;
  username?: string | null;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  role?: string | null;
};

const schema = z
  .object({
    prefix: z.string().optional(),
    firstname: z.string().min(1, "กรุณากรอกชื่อ"),
    lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const password = data.password?.trim() || "";
    const confirmPassword = data.confirmPassword?.trim() || "";

    if (!password && !confirmPassword) return;

    if (password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร",
      });
    }

    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "ยืนยันรหัสผ่านไม่ตรงกัน",
      });
    }
  });

type FormData = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-600 dark:text-slate-300";

const errorClass = "mt-2 text-xs font-semibold text-red-500 dark:text-red-400";

const getFullName = (user: LoginUser | null) => {
  if (!user) return "ผู้ใช้งาน";

  const fullName = `${user.prefix || ""} ${user.firstname || ""} ${
    user.lastname || ""
  }`.trim();

  return fullName || user.username || "ผู้ใช้งาน";
};

const getRoleLabel = (role?: string | null) => {
  if (role === "admin") return "ผู้ดูแลระบบ";
  if (role === "user") return "ผู้ใช้งาน";
  return role || "ผู้ใช้งาน";
};

const getInitial = (user: LoginUser | null) => {
  const value = user?.firstname || user?.username || getFullName(user);
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
};

export default function ProfileCard() {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prefix: "",
      firstname: "",
      lastname: "",
      password: "",
      confirmPassword: "",
    },
  });

  const displayName = useMemo(() => getFullName(currentUser), [currentUser]);
  const displayRole = useMemo(
    () => getRoleLabel(currentUser?.role),
    [currentUser?.role],
  );
  const avatarInitial = useMemo(() => getInitial(currentUser), [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/auth/me", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const user: LoginUser = res.data?.user ?? res.data;
      setCurrentUser(user);

      reset({
        prefix: user?.prefix || "",
        firstname: user?.firstname || "",
        lastname: user?.lastname || "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        prefix: data.prefix || "",
        firstname: data.firstname.trim(),
        lastname: data.lastname.trim(),
        ...(data.password?.trim()
          ? {
              password: data.password.trim(),
              confirmPassword: data.confirmPassword?.trim(),
            }
          : {}),
      };

      const res = await axios.put("/api/auth/profile", payload, {
        validateStatus: () => true,
      });

      if (res.status >= 400) {
        const message = res.data?.message || "บันทึกโปรไฟล์ไม่สำเร็จ";

        if (res.data?.field === "firstname") {
          setError("firstname", { type: "server", message });
        }

        if (res.data?.field === "lastname") {
          setError("lastname", { type: "server", message });
        }

        if (res.data?.field === "password") {
          setError("password", { type: "server", message });
        }

        toast.error(message);
        return;
      }

      const updatedUser: LoginUser = res.data?.user ??
        res.data?.data ?? {
          ...currentUser,
          ...payload,
        };

      setCurrentUser(updatedUser);
      reset({
        prefix: updatedUser.prefix || "",
        firstname: updatedUser.firstname || "",
        lastname: updatedUser.lastname || "",
        password: "",
        confirmPassword: "",
      });

      toast.success("อัปเดตโปรไฟล์สำเร็จ 🎉");
    } catch (error) {
      console.error(error);
      toast.error("บันทึกโปรไฟล์ไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-4xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/70 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="font-semibold">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-8 text-white md:px-10">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-sm" />
          <div className="absolute right-24 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-sm" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-3xl font-black shadow-lg ring-1 ring-white/20 backdrop-blur">
                {avatarInitial}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-100">
                  <Sparkles size={14} />
                  My Profile
                </div>
                <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  @{currentUser?.username || "username"}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold ring-1 ring-white/15 backdrop-blur">
              <ShieldCheck size={17} />
              role: {displayRole}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 p-6 md:p-8"
        >
          <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 md:p-6 dark:border-slate-800 dark:bg-slate-950/50">
            <SectionTitle
              icon={<IdCard size={20} />}
              title="ข้อมูลส่วนตัว"
              description="แก้ไขคำนำหน้า ชื่อ และนามสกุลของบัญชีคุณ"
            />

            <div className="mt-5 grid gap-5 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className={labelClass}>คำนำหน้า</label>
                <select {...register("prefix")} className={inputClass}>
                  <option value="">-- เลือก --</option>
                  <option value="นาย">นาย</option>
                  <option value="น.ส.">น.ส.</option>
                  <option value="นาง">นาง</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>ชื่อ</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    {...register("firstname")}
                    placeholder="กรอกชื่อ"
                    className={`${inputClass} pl-12 ${
                      errors.firstname
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                </div>
                {errors.firstname && (
                  <p className={errorClass}>{errors.firstname.message}</p>
                )}
              </div>

              <div className="md:col-span-5">
                <label className={labelClass}>นามสกุล</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    {...register("lastname")}
                    placeholder="กรอกนามสกุล"
                    className={`${inputClass} pl-12 ${
                      errors.lastname
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                </div>
                {errors.lastname && (
                  <p className={errorClass}>{errors.lastname.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-black/20">
            <SectionTitle
              icon={<LockKeyhole size={20} />}
              title="เปลี่ยนรหัสผ่าน"
              description="เว้นว่างไว้ หากไม่ต้องการเปลี่ยนรหัสผ่าน"
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>รหัสผ่านใหม่</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••"
                    className={`${inputClass} pr-12 pl-12 ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password ? (
                  <p className={errorClass}>{errors.password.message}</p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    อย่างน้อย 6 ตัวอักษร
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder="••••••••"
                    className={`${inputClass} pr-12 pl-12 ${
                      errors.confirmPassword
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={
                      showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className={errorClass}>{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <BadgeCheck size={16} className="text-blue-500" />
              {isDirty
                ? "มีข้อมูลที่ยังไม่ได้บันทึก"
                : "ข้อมูลล่าสุดถูกโหลดแล้ว"}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:from-blue-500 dark:to-indigo-500 dark:shadow-blue-950/40"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </div>
      <div>
        <h2 className="font-black text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
