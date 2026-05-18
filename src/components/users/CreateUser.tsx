"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-toastify";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  username: z.string().min(3, "username อย่างน้อย 3 ตัว"),
  password: z.string().min(6, "password อย่างน้อย 6 ตัว"),
  cid: z
    .string()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรอกชื่อ"),
  lastname: z.string().min(1, "กรอกนามสกุล"),
  role: z.enum(["user", "admin"]),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;
type FormField = keyof FormData;

type ApiErrorResponse = {
  message?: string;
  error?: string;
  field?: string;
  errors?: {
    fieldErrors?: Partial<Record<FormField, string[]>>;
  };
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300";

const errorClass = "mt-2 text-xs font-medium text-red-500 dark:text-red-400";

const isFormField = (field?: string): field is FormField => {
  return [
    "username",
    "password",
    "cid",
    "prefix",
    "firstname",
    "lastname",
    "role",
    "active",
  ].includes(field || "");
};

export default function CreateUserComponent() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      cid: "",
      prefix: "",
      firstname: "",
      lastname: "",
      role: "user",
      active: true,
    },
  });

  const isActive = watch("active");

  const applyServerFieldErrors = (
    payload: ApiErrorResponse,
    fallback: string,
  ) => {
    const field = payload.field;

    if (isFormField(field)) {
      setError(field, {
        type: "server",
        message: payload.message || fallback,
      });
    }

    const fieldErrors = payload.errors?.fieldErrors;

    if (fieldErrors) {
      Object.entries(fieldErrors).forEach(([key, messages]) => {
        if (isFormField(key) && messages?.[0]) {
          setError(key, {
            type: "server",
            message: messages[0],
          });
        }
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      clearErrors();

      const res = await axios.post<ApiErrorResponse | { message: string }>(
        "/api/users",
        data,
        {
          validateStatus: () => true,
        },
      );

      if (res.status >= 400) {
        const payload = res.data as ApiErrorResponse;
        const message =
          payload?.message || payload?.error || "สร้างผู้ใช้ไม่สำเร็จ";

        applyServerFieldErrors(payload, message);
        toast.error(message);
        return;
      }

      toast.success("สร้างผู้ใช้สำเร็จ 🎉");
      reset();
      router.push("/admin/users");
    } catch (err) {
      console.error(err);

      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "สร้างผู้ใช้ไม่สำเร็จ";

        if (err.response?.data) {
          applyServerFieldErrors(err.response.data, message);
        }

        toast.error(message);
        return;
      }

      toast.error("สร้างผู้ใช้ไม่สำเร็จ");
    }
  };

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
                  <UserRoundPlus className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    User Management
                  </p>
                  <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                    เพิ่มผู้ใช้งาน
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    สร้างบัญชีใหม่ กำหนดสิทธิ์ และสถานะการใช้งาน
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur md:self-auto">
                <BadgeCheck size={16} />
                {isActive ? "บัญชีเปิดใช้งาน" : "บัญชีถูกปิดใช้งาน"}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8 p-6 md:p-10"
          >
            <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 transition-colors md:p-6 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <UserRoundPlus size={20} />
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
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    {...register("username")}
                    placeholder="Username"
                    className={`${inputClass} ${
                      errors.username
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.username && (
                    <p className={errorClass}>{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Password
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      อย่างน้อย 6 ตัวอักษร
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12 ${
                        errors.password
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                          : ""
                      }`}
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

                  {errors.password && (
                    <p className={errorClass}>{errors.password.message}</p>
                  )}
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
                  <label className={labelClass}>เลขบัตรประชาชน</label>
                  <input
                    {...register("cid", {
                      onChange: (e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 13);
                        setValue("cid", value, { shouldValidate: true });
                      },
                    })}
                    placeholder="กรอกเลข 13 หลัก"
                    inputMode="numeric"
                    maxLength={13}
                    className={`${inputClass} tracking-widest ${
                      errors.cid
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.cid && (
                    <p className={errorClass}>{errors.cid.message}</p>
                  )}
                </div>

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
                  <input
                    {...register("firstname")}
                    placeholder="ชื่อ"
                    className={`${inputClass} ${
                      errors.firstname
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.firstname && (
                    <p className={errorClass}>{errors.firstname.message}</p>
                  )}
                </div>

                <div className="md:col-span-5">
                  <label className={labelClass}>นามสกุล</label>
                  <input
                    {...register("lastname")}
                    placeholder="นามสกุล"
                    className={`${inputClass} ${
                      errors.lastname
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.lastname && (
                    <p className={errorClass}>{errors.lastname.message}</p>
                  )}
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
                  <label className={labelClass}>Role</label>
                  <select {...register("role")} className={inputClass}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
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
                      {...register("active")}
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
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:from-blue-500 dark:to-indigo-500 dark:shadow-blue-950/40"
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
    </div>
  );
}
