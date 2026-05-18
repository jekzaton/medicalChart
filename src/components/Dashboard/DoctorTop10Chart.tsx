"use client";

import type { ReactNode, RefObject } from "react";
import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Crown,
  Hourglass,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  UserRoundCheck,
  X,
} from "lucide-react";

type DoctorTopItem = {
  rank?: number;
  doctor_code: string;
  doctor_name: string | null;
  doctor_license?: string | null;
  total: number;
  success: number;
  warning: number;
};

type DoctorTopResponse = {
  totalCharts: number;
  totalDoctors: number;
  totalSuccessCharts?: number;
  items: DoctorTopItem[];
  dchdateFrom?: string | null;
  dchdateTo?: string | null;
};

type DoctorTop10ChartProps = {
  /** ส่ง props 2 ตัวนี้มาจาก DashboardClient ได้ ถ้าต้องการใช้ date filter ชุดเดียวกันทั้ง Dashboard */
  dchdateFrom?: string;
  dchdateTo?: string;
};

type SummaryColor = "blue" | "indigo" | "amber" | "emerald";

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

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5" />;
  if (rank === 2) return <Trophy className="h-5 w-5" />;
  if (rank === 3) return <Medal className="h-5 w-5" />;
  return <Award className="h-5 w-5" />;
};

const getRankTheme = (rank: number) => {
  if (rank === 1) {
    return {
      chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
      icon: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/25",
      bar: "from-amber-400 via-orange-500 to-rose-500",
      glow: "shadow-amber-100 dark:shadow-amber-950/20",
    };
  }

  if (rank === 2) {
    return {
      chip: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600/40 dark:bg-slate-700/40 dark:text-slate-200",
      icon: "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-500/20",
      bar: "from-slate-400 via-slate-500 to-slate-600",
      glow: "shadow-slate-100 dark:shadow-slate-950/20",
    };
  }

  if (rank === 3) {
    return {
      chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
      icon: "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-orange-500/25",
      bar: "from-orange-400 via-red-500 to-rose-500",
      glow: "shadow-orange-100 dark:shadow-orange-950/20",
    };
  }

  return {
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    icon: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/25",
    bar: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "shadow-blue-100 dark:shadow-blue-950/20",
  };
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

export default function DoctorTop10Chart({
  dchdateFrom: externalDchdateFrom,
  dchdateTo: externalDchdateTo,
}: DoctorTop10ChartProps) {
  const controlledByParent =
    externalDchdateFrom !== undefined || externalDchdateTo !== undefined;

  const dchdateFromRef = useRef<HTMLInputElement | null>(null);
  const dchdateToRef = useRef<HTMLInputElement | null>(null);

  const [localDchdateFrom, setLocalDchdateFrom] = useState("");
  const [localDchdateTo, setLocalDchdateTo] = useState("");
  const [appliedDchdateFrom, setAppliedDchdateFrom] = useState("");
  const [appliedDchdateTo, setAppliedDchdateTo] = useState("");

  const queryDchdateFrom = controlledByParent
    ? externalDchdateFrom || ""
    : appliedDchdateFrom;
  const queryDchdateTo = controlledByParent
    ? externalDchdateTo || ""
    : appliedDchdateTo;

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
    if (
      localDchdateFrom &&
      localDchdateTo &&
      localDchdateFrom > localDchdateTo
    ) {
      toast.warning("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    setAppliedDchdateFrom(localDchdateFrom);
    setAppliedDchdateTo(localDchdateTo);
  };

  const handleClear = () => {
    setLocalDchdateFrom("");
    setLocalDchdateTo("");
    setAppliedDchdateFrom("");
    setAppliedDchdateTo("");
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useQuery<DoctorTopResponse>({
      queryKey: [
        "medical-chart-doctor-top10",
        queryDchdateFrom,
        queryDchdateTo,
      ],
      queryFn: async () => {
        const res = await axios.get("/api/medical-charts/doctor-top10", {
          params: {
            dchdateFrom: queryDchdateFrom,
            dchdateTo: queryDchdateTo,
            limit: 10,
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

  const items = data?.items || [];
  const totalCharts = data?.totalCharts || 0;
  const totalDoctors = data?.totalDoctors || 0;
  const totalSuccessCharts =
    data?.totalSuccessCharts ??
    items.reduce((sum, item) => sum + item.success, 0);
  const totalWarningCharts = items.reduce((sum, item) => sum + item.warning, 0);

  const topDoctor = items[0] || null;
  const maxSuccess = Math.max(...items.map((item) => item.success), 1);
  const maxTotal = Math.max(...items.map((item) => item.total), 1);
  const successRate =
    totalCharts > 0 ? Math.round((totalSuccessCharts / totalCharts) * 100) : 0;
  const hasDateFilter = Boolean(queryDchdateFrom || queryDchdateTo);

  const podiumItems = useMemo(() => items.slice(0, 3), [items]);

  return (
    <section className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <div className="relative overflow-hidden bg-linear-to-br from-indigo-600 via-blue-600 to-cyan-600 p-5 text-white md:p-7 dark:from-indigo-900 dark:via-blue-900 dark:to-cyan-900">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-sm" />
          <div className="absolute right-36 -bottom-24 h-72 w-72 rounded-full bg-cyan-300/15 blur-md" />
          <div className="absolute top-1/2 left-1/2 h-36 w-36 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="flex min-w-0 items-start gap-4 sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
                <BarChart3 className="h-8 w-8" />
              </div>

              <div className="min-w-0">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                  <Sparkles size={14} />
                  Doctor Top 10
                </div>
                <h2 className="text-2xl font-black tracking-tight md:text-4xl">
                  TOP 10
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
                  Doctor Medical Charts Summary
                </p>
              </div>
            </div>

            {!controlledByParent && (
              <div className="rounded-[1.7rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl xl:min-w-[480px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DateInput
                    label="Discharge เริ่มต้น"
                    value={localDchdateFrom}
                    inputRef={dchdateFromRef}
                    onChange={setLocalDchdateFrom}
                    onOpen={() => openDatePicker(dchdateFromRef.current)}
                  />

                  <DateInput
                    label="Discharge สิ้นสุด"
                    value={localDchdateTo}
                    inputRef={dchdateToRef}
                    onChange={setLocalDchdateTo}
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
            )}

            {controlledByParent && (
              <div className="rounded-[1.7rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl xl:min-w-[380px]">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-100">
                  <CalendarDays size={16} />
                  ช่วงวันที่ที่ใช้ประมวลผล
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <DatePill
                    label="เริ่มต้น"
                    value={formatDate(queryDchdateFrom)}
                  />
                  <DatePill
                    label="สิ้นสุด"
                    value={formatDate(queryDchdateTo)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
          <SummaryCard
            title="Success Total Top 10"
            value={formatNumber(totalSuccessCharts)}
            subtitle="ใช้สำหรับจัดอันดับแพทย์"
            icon={<CheckCircle2 size={22} />}
            color="emerald"
            loading={isLoading}
          />

          <SummaryCard
            title="Charts Total Top 10"
            value={formatNumber(totalCharts)}
            subtitle="Success + Warning"
            icon={<BarChart3 size={22} />}
            color="blue"
            loading={isLoading}
          />

          <SummaryCard
            title="อันดับ 1"
            value={topDoctor ? formatNumber(topDoctor.success) : "0"}
            subtitle={
              topDoctor?.doctor_name ||
              topDoctor?.doctor_code ||
              "ยังไม่มีข้อมูล"
            }
            icon={<Crown size={22} />}
            color="amber"
            loading={isLoading}
          />

          <SummaryCard
            title="ช่วงวันที่"
            value={hasDateFilter ? "Filtered" : "All"}
            subtitle={`${formatDate(queryDchdateFrom)} - ${formatDate(queryDchdateTo)}`}
            icon={<CalendarDays size={22} />}
            color="indigo"
            loading={isLoading}
          />
        </div>

        <div className="p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Ranking by Success Chart
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                อันดับการสรุปชาร์ตของแพทย์
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={14} />
                Success Rate {successRate}%
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle size={14} />
                Warning {formatNumber(totalWarningCharts)}
              </div>

              {isFetching && !isLoading && (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <Hourglass className="h-3.5 w-3.5 animate-spin" />
                  กำลังอัปเดต
                </div>
              )}
            </div>
          </div>

          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              <Podium items={podiumItems} />

              <div className="grid gap-4">
                {items.map((item, index) => {
                  const rank = index + 1;
                  const rankTheme = getRankTheme(rank);
                  const totalValue = Number(item.total || 0);
                  const successValue = Number(item.success || 0);
                  const warningValue = Number(item.warning || 0);

                  const successPercent =
                    totalValue > 0
                      ? clampPercent(
                          Math.round((successValue / totalValue) * 100),
                        )
                      : 0;

                  const warningPercent =
                    totalValue > 0
                      ? clampPercent(
                          Math.round((warningValue / totalValue) * 100),
                        )
                      : 0;

                  // ✅ ให้ความกว้างกราฟตรงกับ percent ที่แสดง
                  const successWidth = successPercent;
                  const warningWidth = warningPercent;

                  // ✅ Total คือฐานทั้งหมด จึงควรเต็ม 100%
                  const totalWidth = totalValue > 0 ? 100 : 0;

                  return (
                    <DoctorRankCard
                      key={`${item.doctor_code}-${rank}`}
                      item={item}
                      rank={rank}
                      rankTheme={rankTheme}
                      successWidth={successWidth}
                      totalWidth={totalWidth}
                      successPercent={successPercent}
                      warningPercent={warningPercent}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
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
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full cursor-pointer rounded-2xl border border-white/20 bg-white/15 px-4 pl-11 text-sm font-bold text-white ring-white/10 backdrop-blur transition outline-none focus:border-white/60 focus:ring-4 dark:bg-slate-950/30"
        />
        <button
          type="button"
          onClick={onOpen}
          className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <CalendarDays size={16} />
        </button>
      </div>
    </div>
  );
}

function DatePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/15">
      <p className="text-xs font-bold text-blue-100">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function SummaryCard({
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
  color: SummaryColor;
  loading: boolean;
}) {
  const colorMap: Record<SummaryColor, string> = {
    blue: "from-blue-500 to-indigo-500 bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    indigo:
      "from-indigo-500 to-violet-500 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    amber:
      "from-amber-500 to-orange-500 bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    emerald:
      "from-emerald-500 to-teal-500 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  };

  const [fromClass, toClass, ...badgeClasses] = colorMap[color].split(" ");

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800/70">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${fromClass} ${toClass}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${badgeClasses.join(" ")}`}
        >
          {icon}
        </div>
        <Activity className="h-4 w-4 text-slate-300 transition group-hover:text-blue-400 dark:text-slate-600" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
        {loading ? (
          <span className="animate-pulse text-slate-300">...</span>
        ) : (
          value
        )}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function Podium({ items }: { items: DoctorTopItem[] }) {
  if (items.length === 0) return null;

  const order = [items[1], items[0], items[2]].filter(Boolean);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {order.map((item) => {
        const rank =
          items.findIndex((doctor) => doctor.doctor_code === item.doctor_code) +
          1;
        const theme = getRankTheme(rank);
        const heightClass =
          rank === 1 ? "lg:min-h-[190px]" : "lg:min-h-[160px]";

        return (
          <div
            key={`podium-${item.doctor_code}`}
            className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-xl transition hover:-translate-y-1 dark:bg-slate-950/50 ${theme.chip} ${theme.glow} ${heightClass}`}
          >
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-current opacity-10" />
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${theme.icon}`}
              >
                {getRankIcon(rank)}
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black dark:bg-slate-900/70">
                Rank #{rank}
              </span>
            </div>

            <div className="mt-5">
              <p className="line-clamp-2 text-lg font-black text-slate-900 dark:text-white">
                {item.doctor_name || "ไม่พบชื่อแพทย์"}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Code: {item.doctor_code}
                {item.doctor_license
                  ? ` • License: ${item.doctor_license}`
                  : ""}
              </p>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Success
                </p>
                <p className="text-4xl font-black text-slate-900 dark:text-white">
                  {formatNumber(item.success)}
                </p>
              </div>
              <div className="text-right text-xs font-bold text-slate-500 dark:text-slate-400">
                <p>Total {formatNumber(item.total)}</p>
                <p>Warning {formatNumber(item.warning)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DoctorRankCard({
  item,
  rank,
  rankTheme,
  successWidth,
  totalWidth,
  successPercent,
  warningPercent,
}: {
  item: DoctorTopItem;
  rank: number;
  rankTheme: ReturnType<typeof getRankTheme>;
  successWidth: number;
  totalWidth: number;
  successPercent: number;
  warningPercent: number;
}) {
  return (
    <article className="group rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl md:p-5 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800/70">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_1fr_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${rankTheme.icon}`}
          >
            {getRankIcon(rank)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-slate-900 md:text-lg dark:text-white">
                {item.doctor_name || "ไม่พบชื่อแพทย์"}
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-black ${rankTheme.chip}`}
              >
                #{rank}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Code: {item.doctor_code}
              {item.doctor_license ? ` • License: ${item.doctor_license}` : ""}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <MetricBar
            label="Success chart"
            value={item.success}
            percent={successPercent}
            width={successWidth}
            barClassName={`bg-gradient-to-r ${rankTheme.bar}`}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniProgress
              label="Total"
              value={item.total}
              percent={100}
              width={totalWidth}
              barClassName="bg-slate-400 dark:bg-slate-500"
            />
            <MiniProgress
              label="Warning"
              value={item.warning}
              percent={warningPercent}
              width={warningPercent}
              barClassName="bg-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:w-[230px]">
          <NumberTile label="Success" value={item.success} tone="emerald" />
          <NumberTile label="Warning" value={item.warning} tone="amber" />
          <NumberTile label="Total" value={item.total} tone="blue" />
        </div>
      </div>
    </article>
  );
}

function MetricBar({
  label,
  value,
  percent,
  width,
  barClassName,
}: {
  label: string;
  value: number;
  percent: number;
  width: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="font-bold text-slate-500 dark:text-slate-400">
          {formatNumber(value)} รายการ • {percent}%
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MiniProgress({
  label,
  value,
  percent,
  width,
  barClassName,
}: {
  label: string;
  value: number;
  percent: number;
  width: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {formatNumber(value)} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClassName}`}
          style={{ width: `${Math.max(width, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function NumberTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "blue";
}) {
  const toneMap = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  };

  return (
    <div className={`rounded-2xl border p-3 text-center ${toneMap[tone]}`}>
      <p className="text-xl font-black">{formatNumber(value)}</p>
      <p className="mt-1 text-[10px] font-black tracking-wide uppercase opacity-80">
        {label}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <Hourglass className="mb-3 h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="font-bold">กำลังประมวลผลข้อมูลแพทย์...</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        ระบบกำลังจัดอันดับจากจำนวน Success
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10" />
      <p className="font-black">โหลดข้อมูลกราฟไม่สำเร็จ</p>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">
      <UserRoundCheck className="mb-3 h-12 w-12" />
      <p className="font-black">ไม่พบข้อมูลแพทย์ในช่วงวันที่นี้</p>
      <p className="mt-1 text-sm">
        ลองเปลี่ยนช่วงวันที่ Discharge แล้วค้นหาอีกครั้ง
      </p>
    </div>
  );
}
