"use client";

import type { ChangeEvent, FormEvent, ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardPenLine,
  FileWarning,
  Hash,
  Hourglass,
  Loader2,
  RotateCcw,
  Save,
  Stethoscope,
  UserRound,
} from "lucide-react";

type ChartStatus = "SUCCESS" | "WARNING" | "success" | "warning";

type Doctor = {
  id: number;
  doctorId: string;
  name: string;
  license?: string | null;
  active?: boolean;
};

type MedicalChart = {
  id: number;
  hn: string;
  an: string;
  fullname: string;
  regdate: string | Date;
  dchdate: string | Date;
  doctor_code: string;
  ward_name: string;
  num_date: number;
  status_chart: ChartStatus;
  created_at?: string | Date;
  updated_at?: string | Date;
  doctor_name?: string | null;
  doctor?: Doctor | null;
};

type FormState = {
  hn: string;
  an: string;
  fullname: string;
  regdate: string;
  dchdate: string;
  doctor_code: string;
  ward_name: string;
  num_date: number;
  status_chart: "SUCCESS" | "WARNING";
};

const initialForm: FormState = {
  hn: "",
  an: "",
  fullname: "",
  regdate: "",
  dchdate: "",
  doctor_code: "",
  ward_name: "",
  num_date: 0,
  status_chart: "WARNING",
};

const inputClass =
  "h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-600 dark:text-slate-300";

const toDateInputValue = (value?: string | Date) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toApiDate = (value: string) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000`);
};

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const calculateDelayDays = (dchdate: string) => {
  if (!dchdate) return 0;

  const dischargeDate = startOfDay(new Date(`${dchdate}T00:00:00.000`));
  const today = startOfDay(new Date());

  const dueDate = new Date(dischargeDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const diffDays = Math.floor(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(diffDays, 0);
};

const normalizeStatus = (status?: ChartStatus): "SUCCESS" | "WARNING" => {
  return String(status || "WARNING").toLowerCase() === "success"
    ? "SUCCESS"
    : "WARNING";
};

export default function EditMedicalChart() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const regdateRef = useRef<HTMLInputElement | null>(null);
  const dchdateRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [originalHn, setOriginalHn] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedDoctor = useMemo(() => {
    return (
      doctors.find((doctor) => doctor.doctorId === form.doctor_code) || null
    );
  }, [doctors, form.doctor_code]);

  const statusConfig = useMemo(() => {
    if (form.status_chart === "SUCCESS") {
      return {
        label: "ตรวจสอบแล้ว",
        icon: CheckCircle2,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    }

    return {
      label: "รอตรวจสอบ",
      icon: FileWarning,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }, [form.status_chart]);

  const StatusIcon = statusConfig.icon;

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;

    const inputWithPicker = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    try {
      if (typeof inputWithPicker.showPicker === "function") {
        inputWithPicker.showPicker();
      } else {
        input.focus();
      }
    } catch {
      input.focus();
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "num_date" ? Math.max(Number(value) || 0, 0) : value,
    }));
  };

  const handleDchdateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      dchdate: value,
      num_date: calculateDelayDays(value),
    }));
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [chartRes, doctorsRes] = await Promise.all([
        axios.get(`/api/medical-charts/${id}`),
        axios.get("/api/doctors", {
          params: {
            page: 1,
            limit: 100,
            search: "",
          },
        }),
      ]);

      const chart: MedicalChart = chartRes.data?.data || chartRes.data;
      const doctorList: Doctor[] = doctorsRes.data?.data || [];

      setDoctors(doctorList);
      setOriginalHn(chart.hn || "");
      setForm({
        hn: chart.hn || "",
        an: chart.an || "",
        fullname: chart.fullname || "",
        regdate: toDateInputValue(chart.regdate),
        dchdate: toDateInputValue(chart.dchdate),
        doctor_code: chart.doctor_code || "",
        ward_name: chart.ward_name || "",
        num_date: Number(chart.num_date || 0),
        status_chart: normalizeStatus(chart.status_chart),
      });
    } catch (err) {
      console.error(err);
      setError("โหลดข้อมูล Medical Chart ไม่สำเร็จ");
      toast.error("โหลดข้อมูล Medical Chart ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validateForm = () => {
    if (!form.hn.trim()) return "กรุณากรอก HN";
    if (!form.an.trim()) return "กรุณากรอก AN";
    if (!form.fullname.trim()) return "กรุณากรอกชื่อ - สกุล";
    if (!form.regdate) return "กรุณาเลือกวัน Admit";
    if (!form.dchdate) return "กรุณาเลือกวัน Discharge";
    if (!form.doctor_code) return "กรุณาเลือกแพทย์";
    if (!form.ward_name.trim()) return "กรุณากรอกชื่อวอร์ด";

    const regdate = new Date(`${form.regdate}T00:00:00.000`);
    const dchdate = new Date(`${form.dchdate}T00:00:00.000`);

    if (regdate > dchdate) {
      return "วัน Admit ต้องไม่มากกว่าวัน Discharge";
    }

    return "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (saving) return;

    const message = validateForm();
    if (message) {
      toast.warning(message);
      return;
    }

    try {
      setSaving(true);

      await axios.put(`/api/medical-charts/${id}`, {
        hn: form.hn.trim(),
        an: form.an.trim(),
        fullname: form.fullname.trim(),
        regdate: toApiDate(form.regdate),
        dchdate: toApiDate(form.dchdate),
        doctor_code: form.doctor_code,
        ward_name: form.ward_name.trim(),
        num_date: Number(form.num_date || 0),
        status_chart: form.status_chart,
      });

      toast.success("บันทึกข้อมูลสำเร็จ 🎉");
      router.push("/admin/medical-chart");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const field = err.response?.data?.field;
        const message = err.response?.data?.message;

        if (field === "hn") {
          toast.error("HN นี้มีอยู่ในระบบแล้ว");
          return;
        }

        toast.error(message || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }

      toast.error("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <Hourglass className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="font-medium">กำลังโหลดข้อมูล Medical Chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10" />
        <h2 className="text-xl font-bold">เกิดข้อผิดพลาด</h2>
        <p className="mt-2 text-sm">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <button
          type="button"
          onClick={() => router.push("/admin/medical-chart")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500/50 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          กลับหน้า Medical Chart
        </button>

        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="relative overflow-hidden bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-10 dark:from-blue-700 dark:via-indigo-800 dark:to-violet-800">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-16 h-44 w-44 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
                  <ClipboardPenLine className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Edit Medical Chart
                  </p>
                  <h1 className="text-2xl font-bold md:text-3xl">
                    แก้ไข Medical Chart
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    ปรับปรุงข้อมูล Admit / Discharge แพทย์ผู้ดูแล
                    และสถานะการตรวจสอบ
                  </p>
                </div>
              </div>

              <div
                className={`inline-flex items-center gap-2 self-start rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur md:self-auto ${statusConfig.className}`}
              >
                <StatusIcon size={18} />
                {statusConfig.label}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 md:p-6 dark:border-slate-700 dark:bg-slate-950/40">
              <SectionTitle
                icon={<UserRound size={20} />}
                title="ข้อมูลผู้ป่วย"
                description="HN เป็นข้อมูล unique ตาม schema ส่วน AN สามารถแก้ไขได้ตามรายการ"
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputField
                  label="HN"
                  name="hn"
                  value={form.hn}
                  onChange={handleChange}
                  icon={<Hash size={18} />}
                  placeholder="กรอก HN"
                  hint={
                    originalHn && form.hn !== originalHn
                      ? `HN เดิม: ${originalHn}`
                      : "HN ห้ามซ้ำกับรายการอื่น"
                  }
                />

                <InputField
                  label="AN"
                  name="an"
                  value={form.an}
                  onChange={handleChange}
                  icon={<Hash size={18} />}
                  placeholder="กรอก AN"
                  hint="AN ไม่ได้บังคับ unique ตาม schema ล่าสุด"
                />

                <div className="md:col-span-2">
                  <InputField
                    label="ชื่อ - สกุล"
                    name="fullname"
                    value={form.fullname}
                    onChange={handleChange}
                    icon={<UserRound size={18} />}
                    placeholder="กรอกชื่อ - สกุล"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 md:p-6 dark:border-slate-700 dark:bg-slate-950/40">
              <SectionTitle
                icon={<CalendarDays size={20} />}
                title="ข้อมูล Admit / Discharge"
                description="ระบบจะคำนวณจำนวนวันล่าช้าจากวัน Discharge + 7 วัน"
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <DateField
                  label="วัน Admit"
                  value={form.regdate}
                  inputRef={regdateRef}
                  onOpen={() => openDatePicker(regdateRef.current)}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, regdate: value }))
                  }
                />

                <DateField
                  label="วัน Discharge"
                  value={form.dchdate}
                  inputRef={dchdateRef}
                  onOpen={() => openDatePicker(dchdateRef.current)}
                  onChange={handleDchdateChange}
                />

                <div>
                  <label className={labelClass}>จำนวนวันล่าช้า</label>
                  <div className="relative">
                    <Activity className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="number"
                      min={0}
                      name="num_date"
                      value={form.num_date}
                      onChange={handleChange}
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        num_date: calculateDelayDays(prev.dchdate),
                      }))
                    }
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                  >
                    <RotateCcw size={13} />
                    คำนวณใหม่จากวัน Discharge
                  </button>
                </div>

                <div className="md:col-span-3">
                  <InputField
                    label="Ward / ชื่อวอร์ด"
                    name="ward_name"
                    value={form.ward_name}
                    onChange={handleChange}
                    icon={<Activity size={18} />}
                    placeholder="เช่น อายุรกรรม, ศัลยกรรม"
                    hint="field นี้เป็น required ตาม schema"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 md:p-6 dark:border-slate-700 dark:bg-slate-950/40">
              <SectionTitle
                icon={<Stethoscope size={20} />}
                title="แพทย์และสถานะ"
                description="เลือกแพทย์ผู้ดูแลและสถานะการตรวจสอบเวชระเบียน"
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>แพทย์ผู้ดูแล</label>
                  <select
                    name="doctor_code"
                    value={form.doctor_code}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">-- เลือกแพทย์ --</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.doctorId}>
                        {doctor.doctorId} - {doctor.name}
                      </option>
                    ))}
                  </select>

                  {selectedDoctor && (
                    <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <p className="font-semibold">{selectedDoctor.name}</p>
                      <p className="mt-1 text-xs opacity-80">
                        Code: {selectedDoctor.doctorId}
                        {selectedDoctor.license
                          ? ` • License: ${selectedDoctor.license}`
                          : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>สถานะการตรวจสอบ</label>
                  <select
                    name="status_chart"
                    value={form.status_chart}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="WARNING">รอตรวจสอบ</option>
                    <option value="SUCCESS">ตรวจสอบแล้ว</option>
                  </select>

                  <div
                    className={`mt-3 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold ${statusConfig.className}`}
                  >
                    <StatusIcon size={16} />
                    {statusConfig.label}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
              <button
                type="button"
                onClick={() => router.push("/admin/medical-chart")}
                disabled={saving}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:from-blue-500 dark:to-indigo-500 dark:shadow-blue-950/40"
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

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </div>
      <div>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  icon,
  placeholder,
  hint,
}: {
  label: string;
  name: keyof FormState;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  icon: ReactNode;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 dark:text-slate-500">
          {icon}
        </div>
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClass} pl-12`}
        />
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  inputRef,
  onOpen,
  onChange,
}: {
  label: string;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} cursor-pointer pl-12`}
        />
        <button
          type="button"
          onClick={onOpen}
          className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-blue-300"
        >
          <CalendarDays size={18} />
        </button>
      </div>
    </div>
  );
}
