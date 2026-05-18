"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  BadgeCheck,
  BellOff,
  BellRing,
  ClipboardCheck,
  IdCard,
  Loader2,
  Save,
  ShieldCheck,
  Stethoscope,
  UserRoundCog,
} from "lucide-react";

type DoctorForm = {
  doctorId: string;
  name: string;
  cid: string;
  license: string;
  active: boolean;
  line_active: boolean;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20";

const labelClass =
  "mb-2 block text-sm font-bold text-slate-600 dark:text-slate-300";

const helpTextClass =
  "mt-2 text-xs font-medium text-slate-400 dark:text-slate-500";

export default function EditDoctor() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<DoctorForm>({
    doctorId: "",
    name: "",
    cid: "",
    license: "",
    active: true,
    line_active: true,
  });

  const fetchDoctor = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`/api/doctors/${id}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const doctor = res.data;

      setForm({
        doctorId: doctor.doctorId ?? "",
        name: doctor.name ?? "",
        cid: doctor.cid ?? "",
        license: doctor.license ?? "",
        active: Boolean(doctor.active),
        line_active: Boolean(doctor.line_active),
      });
    } catch (err) {
      console.error(err);
      toast.error("โหลดข้อมูลแพทย์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCidChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 13);
    setForm((prev) => ({ ...prev, cid: value }));
  };

  const toggleField = (field: "active" | "line_active") => {
    if (field === "line_active" && !form.cid) {
      toast.warning("กรุณากรอก CID ก่อนเปิดรับ LINE");
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) return;

    if (!form.doctorId.trim()) {
      toast.error("กรอกรหัสแพทย์");
      return;
    }

    if (!form.name.trim()) {
      toast.error("กรอกชื่อ-สกุลแพทย์");
      return;
    }

    if (!form.license.trim()) {
      toast.error("กรอกใบประกอบวิชาชีพ");
      return;
    }

    if (form.cid.length !== 13) {
      toast.error("เลขบัตรประชาชนต้องเป็นเลข 13 หลัก");
      return;
    }

    try {
      setSaving(true);

      await axios.put(`/api/doctors/${id}`, {
        doctorId: form.doctorId.trim(),
        name: form.name.trim(),
        cid: form.cid.trim(),
        license: form.license.trim(),
        active: Boolean(form.active),
        line_active: Boolean(form.line_active),
      });

      toast.success("บันทึกข้อมูลแพทย์สำเร็จ");
      router.refresh();
      router.push(`/admin/doctors?refresh=${Date.now()}`);
    } catch (err: any) {
      const rawField = err?.response?.data?.field;
      const message = err?.response?.data?.message;

      let field = Array.isArray(rawField) ? rawField[0] : rawField;

      if (field?.includes("doctorId")) field = "doctorId";
      if (field?.includes("cid")) field = "cid";
      if (field?.includes("license")) field = "license";

      if (field === "doctorId") {
        toast.error("รหัสแพทย์นี้ถูกใช้แล้ว");
      } else if (field === "cid") {
        toast.error("เลขบัตรประชาชนนี้ถูกใช้แล้ว");
      } else if (field === "license") {
        toast.error("เลขใบประกอบวิชาชีพนี้ถูกใช้แล้ว");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-4xl bg-linear-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-10 py-8 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="text-center">
            <p className="font-black text-slate-800 dark:text-slate-100">
              กำลังโหลดข้อมูลแพทย์
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              กรุณารอสักครู่
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-xl shadow-blue-100/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white md:p-7">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-sm" />
            <div className="absolute right-24 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-sm" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
                  <Stethoscope className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-sm font-bold text-blue-100">
                    Doctor Profile
                  </p>
                  <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                    แก้ไขข้อมูลแพทย์
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
                    จัดการข้อมูลแพทย์ สถานะการใช้งาน และการรับแจ้งเตือน LINE
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/admin/doctors")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 text-sm font-black text-white ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-white/25"
              >
                <ArrowLeft size={18} />
                กลับหน้ารายชื่อ
              </button>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/70 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                <UserRoundCog size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                  ข้อมูลแพทย์
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>รหัสแพทย์</label>
                <div className="relative">
                  <Stethoscope className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    name="doctorId"
                    value={form.doctorId}
                    onChange={handleChange}
                    placeholder="เช่น 00123"
                    className={`${inputClass} pl-12`}
                  />
                </div>
                <p className={helpTextClass}>
                  ใช้เชื่อมกับ medical_chart.doctor_code
                </p>
              </div>

              <div>
                <label className={labelClass}>เลขบัตรประชาชน / CID</label>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    name="cid"
                    value={form.cid}
                    onChange={handleCidChange}
                    placeholder="เลข 13 หลัก"
                    maxLength={13}
                    inputMode="numeric"
                    className={`${inputClass} pl-12`}
                  />
                </div>
                <p
                  className={`mt-2 text-xs font-bold ${
                    form.cid.length === 13
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {form.cid.length}/13 หลัก
                </p>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>ชื่อ-สกุลแพทย์</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="ชื่อ-สกุลแพทย์"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>เลขใบประกอบวิชาชีพ</label>
                <input
                  name="license"
                  value={form.license}
                  onChange={handleChange}
                  placeholder="เลขใบประกอบวิชาชีพ"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/70 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    สถานะ
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    เปิด/ปิดการใช้งานและการแจ้งเตือน
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <ToggleCard
                  title="เปิดใช้งานแพทย์"
                  description="ใช้สำหรับแสดงและใช้งานแพทย์ในระบบ"
                  checked={form.active}
                  onClick={() => toggleField("active")}
                  activeLabel="เปิดใช้งาน"
                  inactiveLabel="ปิดใช้งาน"
                  iconOn={<BadgeCheck size={20} />}
                  iconOff={<ShieldCheck size={20} />}
                  activeClassName="bg-emerald-500"
                  checkedBadgeClassName="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                />

                <ToggleCard
                  title="รับแจ้งเตือน LINE"
                  description="ใช้สำหรับส่งสรุปชาร์ตไปยัง CID ของแพทย์"
                  checked={form.line_active}
                  onClick={() => toggleField("line_active")}
                  disabled={!form.cid}
                  activeLabel="รับ LINE"
                  inactiveLabel="ปิด LINE"
                  iconOn={<BellRing size={20} />}
                  iconOff={<BellOff size={20} />}
                  activeClassName="bg-sky-500"
                  checkedBadgeClassName="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
                />
              </div>
            </section>

            <section className="rounded-4xl border border-blue-100 bg-blue-50 p-5 text-blue-800 shadow-lg shadow-blue-100/60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200 dark:shadow-black/20">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                  <BellRing size={20} />
                </div>
                <div>
                  <p className="font-black">LINE Active</p>
                  <p className="mt-1 text-sm leading-6 opacity-80">
                    หากปิด LINE Active แพทย์คนนี้จะไม่ถูกส่งข้อความสรุปชาร์ต
                    ถึงแม้จะมี CID อยู่ในระบบ
                  </p>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-xl shadow-blue-200/70 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-blue-950/40"
            >
              {saving ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Save size={19} className="transition group-hover:scale-110" />
              )}
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลแพทย์"}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  disabled,
  onClick,
  activeLabel,
  inactiveLabel,
  iconOn,
  iconOff,
  activeClassName,
  checkedBadgeClassName,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  activeClassName: string;
  checkedBadgeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
                checked
                  ? checkedBadgeClassName
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              {checked ? iconOn : iconOff}
              {checked ? activeLabel : inactiveLabel}
            </span>
          </div>

          <p className="mt-3 font-black text-slate-800 dark:text-slate-100">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {disabled ? "ต้องมี CID ก่อนจึงจะเปิดรับ LINE ได้" : description}
          </p>
        </div>

        <span
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-0.5 shadow-inner transition ${
            checked ? activeClassName : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white shadow transition ${
              checked ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {checked ? (
              <span className="h-2.5 w-2.5 rounded-full bg-current text-emerald-500" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            )}
          </span>
        </span>
      </div>
    </button>
  );
}
