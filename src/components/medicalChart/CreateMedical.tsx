"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-toastify";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const schema = z.object({
  doctorId: z.string().min(1, "กรอกรหัสแพทย์"),
  name: z.string().min(1, "กรอกชื่อ"),
  cid: z
    .string()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  license: z.string().min(1, "กรอกเลขใบประกอบวิชาชีพ"),
});

type FormData = z.infer<typeof schema>;

export default function CreateDoctorComponent() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
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
    const res = await axios.post("/api/doctors", data, {
      validateStatus: () => true,
    });

    if (res.status >= 400) {
      toast.error(res.data?.message || "ข้อมูลซ้ำ");
      return;
    }

    toast.success("เพิ่มชื่อแพทย์สำเร็จ", {
      onClose: () => router.push("/admin/doctors"),
    });
    reset();
  };

  return (
    <div className="flex min-h-screen items-start justify-center overflow-y-auto p-6 pt-10">
      <div className="mt-4 w-full max-w-lg rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-3 text-2xl font-semibold text-gray-800">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-500 to-indigo-500 text-white shadow">
              <UserRoundPlus size={20} />
            </span>
          </div>

          <p className="text-xl text-gray-500">เพิ่มชื่อแพทย์</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* doctorId */}
          <div>
            <input
              {...register("doctorId")}
              placeholder="รหัสแพทย์"
              className="input"
            />
            {errors.doctorId && (
              <p className="error">{errors.doctorId.message}</p>
            )}
          </div>

          {/* name */}
          <div>
            <input
              {...register("name")}
              placeholder="ชื่อ-นามสกุล"
              className="input"
            />
            {errors.name && <p className="error">{errors.name.message}</p>}
          </div>

          {/* cid */}
          <div>
            <input
              {...register("cid")}
              placeholder="เลขบัตรประชาชน 13 หลัก"
              maxLength={13}
              className="input"
            />
            {errors.cid && <p className="error">{errors.cid.message}</p>}
          </div>

          {/* license */}
          <div>
            <input
              {...register("license")}
              placeholder="เลขใบประกอบวิชาชีพ"
              className="input"
            />
            {errors.license && (
              <p className="error">{errors.license.message}</p>
            )}
          </div>

          {/* submit */}
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <Loader2 className="animate-spin" /> : "บันทึก"}
          </button>
        </form>
      </div>
    </div>
  );
}
