"use client";

import type { ReactNode, RefObject } from "react";
import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  FileBarChart2,
  Hourglass,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  X,
} from "lucide-react";

type DashboardResponse = {
  total: number;
  success: number;
  warning: number;
  dchdateFrom?: string | null;
  dchdateTo?: string | null;
  doctor_name?: string | null;
  doctor_code?: string | null;
  role?: "admin" | "user" | string;
  message?: string | null;
};

type ThemeColor = "blue" | "emerald" | "amber" | "violet";

const formatNumber = (value?: number) => Number(value || 0).toLocaleString();

const formatDate = (value?: string) => {
  if (!value) return "ไม่กำหนด";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "ไม่กำหนด";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const colorMap: Record<ThemeColor, string> = {
  blue: "from-blue-500 to-indigo-500 bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  emerald:
    "from-emerald-500 to-teal-500 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:
    "from-amber-500 to-orange-500 bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  violet:
    "from-violet-500 to-fuchsia-500 bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
};

export default function DashboardUser() {
  const dchdateFromRef = useRef<HTMLInputElement | null>(null);
  const dchdateToRef = useRef<HTMLInputElement | null>(null);

  const [dchdateFrom, setDchdateFrom] = useState("");
  const [dchdateTo, setDchdateTo] = useState("");
  const [appliedDchdateFrom, setAppliedDchdateFrom] = useState("");
  const [appliedDchdateTo, setAppliedDchdateTo] = useState("");

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

  const handleSearch = () => {
    if (dchdateFrom && dchdateTo && dchdateFrom > dchdateTo) {
      toast.warning("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    setAppliedDchdateFrom(dchdateFrom);
    setAppliedDchdateTo(dchdateTo);
  };

  const handleClear = () => {
    setDchdateFrom("");
    setDchdateTo("");
    setAppliedDchdateFrom("");
    setAppliedDchdateTo("");
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useQuery<DashboardResponse>({
      queryKey: [
        "user-medical-chart-dashboard",
        appliedDchdateFrom,
        appliedDchdateTo,
      ],
      queryFn: async () => {
        const res = await axios.get("/api/medical-charts/dashboard", {
          params: {
            dchdateFrom: appliedDchdateFrom,
            dchdateTo: appliedDchdateTo,
          },
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        return res.data;
      },
      placeholderData: keepPreviousData,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    });

  const total = data?.total || 0;
  const success = data?.success || 0;
  const warning = data?.warning || 0;

  const successPercent = total > 0 ? Math.round((success / total) * 100) : 0;
  const warningPercent = total > 0 ? Math.round((warning / total) * 100) : 0;
  const hasDateFilter = Boolean(appliedDchdateFrom || appliedDchdateTo);

  const donutStyle = useMemo(
    () => ({
      background: `conic-gradient(rgb(16 185 129) 0deg ${
        successPercent * 3.6
      }deg, rgb(245 158 11) ${successPercent * 3.6}deg 360deg)`,
    }),
    [successPercent],
  );

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-xl shadow-blue-100/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white md:p-8">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-sm" />
            <div className="absolute right-28 -bottom-20 h-60 w-60 rounded-full bg-white/10 blur-sm" />
            <div className="absolute top-1/2 left-1/2 h-24 w-24 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1fr_minmax(360px,520px)] xl:items-center">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
                  <FileBarChart2 className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                    <Sparkles size={14} />
                    My Medical Chart Dashboard
                  </div>

                  <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                    Dashboard
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
                    รายการรอตรวจสอบตามช่วงวัน Discharge
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                      <ShieldCheck size={14} />
                      ข้อมูลของฉันเท่านั้น
                    </span>

                    {data?.doctor_name && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                        <UserRoundCheck size={14} />
                        {data.doctor_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DateInput
                    label="Discharge เริ่มต้น"
                    value={dchdateFrom}
                    inputRef={dchdateFromRef}
                    onChange={setDchdateFrom}
                    onOpen={() => openDatePicker(dchdateFromRef.current)}
                  />

                  <DateInput
                    label="Discharge สิ้นสุด"
                    value={dchdateTo}
                    inputRef={dchdateToRef}
                    onChange={setDchdateTo}
                    onOpen={() => openDatePicker(dchdateToRef.current)}
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
                  >
                    <Search size={16} />
                    ค้นหาและประมวลผล
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/25"
                  >
                    <X size={16} />
                    ล้าง
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="ชาร์ตของฉันทั้งหมด"
            value={formatNumber(total)}
            subtitle="จำนวน Medical Chart ที่เกี่ยวข้องกับคุณ"
            icon={<FileBarChart2 size={24} />}
            color="blue"
            loading={isLoading}
          />

          <StatCard
            title="Success"
            value={formatNumber(success)}
            subtitle={`คิดเป็น ${successPercent}% ของทั้งหมด`}
            icon={<CheckCircle2 size={24} />}
            color="emerald"
            loading={isLoading}
          />

          <StatCard
            title="Warning"
            value={formatNumber(warning)}
            subtitle={`คิดเป็น ${warningPercent}% ของทั้งหมด`}
            icon={<AlertTriangle size={24} />}
            color="amber"
            loading={isLoading}
          />

          <StatCard
            title="อัตราสำเร็จ"
            value={`${successPercent}%`}
            subtitle="Success เทียบกับทั้งหมด"
            icon={<CircleGauge size={24} />}
            color="violet"
            loading={isLoading}
          />
        </section>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <LoadingState />
        ) : data?.message ? (
          <InfoState message={data.message} />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(320px,430px)_1fr]">
            <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/70 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                    ภาพรวมสถานะ
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Success / Warning จากข้อมูลของคุณ
                  </p>
                </div>

                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <Hourglass className="h-3.5 w-3.5 animate-spin" />
                    กำลังอัปเดต
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-5">
                <div
                  className="relative flex h-56 w-56 items-center justify-center rounded-full p-5 shadow-inner shadow-slate-200 dark:shadow-black/30"
                  style={donutStyle}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-xl dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      Success Rate
                    </p>
                    <p className="mt-1 text-5xl font-black text-slate-900 dark:text-white">
                      {successPercent}%
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                      {formatNumber(success)} / {formatNumber(total)} รายการ
                    </p>
                  </div>
                </div>

                <div className="grid w-full gap-3">
                  <LegendItem
                    label="Success"
                    value={success}
                    percent={successPercent}
                    className="bg-emerald-500"
                  />
                  <LegendItem
                    label="Warning"
                    value={warning}
                    percent={warningPercent}
                    className="bg-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/70 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                    สรุปตามช่วงวันที่
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    ช่วงวันที่ Discharge ที่ใช้ประมวลผล
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DatePill
                    label="เริ่มต้น"
                    value={formatDate(appliedDchdateFrom)}
                  />
                  <DatePill
                    label="สิ้นสุด"
                    value={formatDate(appliedDchdateTo)}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <ProgressRow
                  label="Success"
                  value={success}
                  percent={successPercent}
                  barClassName="bg-linear-to-r from-emerald-500 to-teal-500"
                />
                <ProgressRow
                  label="Warning"
                  value={warning}
                  percent={warningPercent}
                  barClassName="bg-linear-to-r from-amber-500 to-orange-500"
                />
                <ProgressRow
                  label="รวมทั้งหมด"
                  value={total}
                  percent={100}
                  barClassName="bg-linear-to-r from-blue-500 to-indigo-500"
                />
              </div>

              <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-slate-100">
                      {hasDateFilter
                        ? "ประมวลผลตามช่วงวันที่ที่เลือก"
                        : "ประมวลผลจากข้อมูลทั้งหมดของคุณ"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      ข้อมูลนี้ถูกจำกัดด้วยบัญชีผู้ใช้ที่เข้าสู่ระบบ
                      จึงแสดงเฉพาะรายการที่ผูกกับเลขบัตรประชาชนของคุณเท่านั้น
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  inputRef,
  onChange,
  onOpen,
}: {
  label: string;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onOpen: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-blue-100">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full cursor-pointer rounded-2xl border border-white/20 bg-white/15 px-4 pl-11 text-sm font-bold text-white ring-white/10 backdrop-blur transition outline-none focus:border-white/60 focus:ring-4 dark:bg-slate-950/30"
        />
        <button
          type="button"
          onClick={onOpen}
          className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label={`เลือกวันที่ ${label}`}
        >
          <CalendarDays size={16} />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color: ThemeColor;
  loading: boolean;
}) {
  const [fromClass, toClass, ...badgeClasses] = colorMap[color].split(" ");

  return (
    <div className="group relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/70 transition hover:-translate-y-0.5 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${fromClass} ${toClass}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${badgeClasses.join(" ")}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-4xl font-black text-slate-900 dark:text-white">
        {loading ? (
          <span className="animate-pulse text-slate-300">...</span>
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function DatePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function LegendItem({
  label,
  value,
  percent,
  className,
}: {
  label: string;
  value: number;
  percent: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${className}`} />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </span>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          {formatNumber(value)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{percent}%</p>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  percent,
  barClassName,
}: {
  label: string;
  value: number;
  percent: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {formatNumber(value)} รายการ • {percent}%
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClassName}`}
          style={{ width: `${Math.max(percent, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-20 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <Hourglass className="mb-3 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="font-bold">กำลังประมวลผลข้อมูล...</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        ระบบกำลังสรุปข้อมูล Medical Chart ของคุณ
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-4xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10" />
      <p className="font-black">โหลดข้อมูล Dashboard ไม่สำเร็จ</p>
      <p className="mt-1 text-sm opacity-80">ลองโหลดข้อมูลใหม่อีกครั้ง</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
      >
        <RefreshCw size={15} />
        ลองใหม่
      </button>
    </div>
  );
}

function InfoState({ message }: { message: string }) {
  return (
    <div className="rounded-4xl border border-blue-200 bg-blue-50 p-8 text-center text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
      <UserRoundCheck className="mx-auto mb-3 h-10 w-10" />
      <p className="font-black">ยังไม่มีข้อมูลสำหรับบัญชีนี้</p>
      <p className="mt-1 text-sm opacity-80">{message}</p>
    </div>
  );
}
