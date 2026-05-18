"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-toastify";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardPlus,
  Loader2,
  Save,
  Stethoscope,
  UserRoundPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  doctorId: z.string().min(1, "กรอกรหัสแพทย์"),
  name: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  cid: z
    .string()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  license: z.string().min(1, "กรอกเลขใบประกอบวิชาชีพ"),
});

type FormData = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300";

const errorClass = "mt-2 text-xs font-medium text-red-500 dark:text-red-400";

export default function CreateDoctorComponent() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctorId: "",
      name: "",
      cid: "",
      license: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await axios.post("/api/doctors", data, {
        validateStatus: () => true,
      });

      if (res.status >= 400) {
        toast.error(res.data?.message || "ข้อมูลซ้ำ");
        return;
      }

      toast.success("เพิ่มชื่อแพทย์สำเร็จ 🎉");
      reset();
      router.push("/admin/doctors");
    } catch (err) {
      console.error(err);
      toast.error("เพิ่มชื่อแพทย์ไม่สำเร็จ");
    }
  };

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/admin/doctors")}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          กลับหน้ารายชื่อแพทย์
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
                    Doctor Management
                  </p>
                  <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                    เพิ่มชื่อแพทย์
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    บันทึกข้อมูลแพทย์ รหัสแพทย์ และเลขใบประกอบวิชาชีพ
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur md:self-auto">
                <Stethoscope size={16} />
                แพทย์ใหม่
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
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    ข้อมูลแพทย์
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    รหัสแพทย์และชื่อ-นามสกุล
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className={labelClass}>รหัสแพทย์</label>
                  <input
                    {...register("doctorId")}
                    placeholder="เช่น D001"
                    className={`${inputClass} ${
                      errors.doctorId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.doctorId && (
                    <p className={errorClass}>{errors.doctorId.message}</p>
                  )}
                </div>

                <div className="md:col-span-8">
                  <label className={labelClass}>ชื่อ-นามสกุล</label>
                  <input
                    {...register("name")}
                    placeholder="ชื่อ-นามสกุลแพทย์"
                    className={`${inputClass} ${
                      errors.name
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.name && (
                    <p className={errorClass}>{errors.name.message}</p>
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
                    ข้อมูลยืนยันตัวตน
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    เลขบัตรประชาชนและเลขใบประกอบวิชาชีพ
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
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

                <div>
                  <label className={labelClass}>เลขใบประกอบวิชาชีพ</label>
                  <input
                    {...register("license")}
                    placeholder="เลขใบประกอบวิชาชีพ"
                    className={`${inputClass} ${
                      errors.license
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                        : ""
                    }`}
                  />
                  {errors.license && (
                    <p className={errorClass}>{errors.license.message}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 transition-colors md:p-6 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <ClipboardPlus size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                      พร้อมบันทึกข้อมูล
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ตรวจสอบข้อมูลให้ถูกต้องก่อนกดบันทึก
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  ข้อมูลนี้จะถูกเพิ่มในรายการแพทย์
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={() => router.push("/admin/doctors")}
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
