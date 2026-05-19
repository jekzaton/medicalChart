"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FileSearch,
  Hourglass,
  RefreshCw,
  Search,
  Stethoscope,
  UserRoundCheck,
  X,
} from "lucide-react";

type DoctorChartItem = {
  id?: number;
  rank?: number;
  doctor_code: string;
  doctor_name: string | null;
  doctor_license?: string | null;
  doctor_cid?: string | null;
  doctor_active?: boolean | null;
  doctor_line_active?: boolean | null;
  total: number;
  success: number;
  warning: number;
};

type DoctorChartResponse = {
  data?: DoctorChartItem[];
  items?: DoctorChartItem[];
  totalCharts?: number;
  totalDoctors?: number;
  totalSuccessCharts?: number;
  totalWarningCharts?: number;
  summary?: {
    totalDoctors?: number;
    totalCharts?: number;
    totalSuccess?: number;
    totalWarning?: number;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    dchdateFrom?: string | null;
    dchdateTo?: string | null;
    search?: string | null;
  };
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

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

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const getPercent = (value: number, total: number) => {
  if (!total || total <= 0) return 0;
  return clampPercent(Math.round((value / total) * 100));
};

const buildPageNumbers = (currentPage: number, totalPages: number) => {
  const maxVisible = 5;
  const pages: number[] = [];

  if (totalPages <= maxVisible) {
    for (let page = 1; page <= totalPages; page += 1) pages.push(page);
    return pages;
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
};

export default function DoctorChartCM() {
  const dchdateFromRef = useRef<HTMLInputElement | null>(null);
  const dchdateToRef = useRef<HTMLInputElement | null>(null);

  const [dchdateFrom, setDchdateFrom] = useState("");
  const [dchdateTo, setDchdateTo] = useState("");
  const [search, setSearch] = useState("");

  const [appliedDchdateFrom, setAppliedDchdateFrom] = useState("");
  const [appliedDchdateTo, setAppliedDchdateTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

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
    const nextSearch = search.trim();

    if (dchdateFrom && dchdateTo && dchdateFrom > dchdateTo) {
      toast.warning("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    setAppliedDchdateFrom(dchdateFrom);
    setAppliedDchdateTo(dchdateTo);
    setAppliedSearch(nextSearch);
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleClear = () => {
    setDchdateFrom("");
    setDchdateTo("");
    setSearch("");
    setAppliedDchdateFrom("");
    setAppliedDchdateTo("");
    setAppliedSearch("");
    setCurrentPage(1);
    setPageSize(10);
    setHasSearched(false);
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useQuery<DoctorChartResponse>({
      queryKey: [
        "doctor-chart-summary",
        currentPage,
        pageSize,
        appliedDchdateFrom,
        appliedDchdateTo,
        appliedSearch,
      ],
      enabled: hasSearched,
      queryFn: async () => {
        const res = await axios.get("/api/medical-charts/doctor-summary", {
          params: {
            page: currentPage,
            limit: pageSize,
            search: appliedSearch,
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
      refetchOnWindowFocus: false,
    });

  const items = data?.items || data?.data || [];
  const meta = data?.meta;

  const totalPages = Math.max(meta?.totalPages || 1, 1);
  const totalRecords = meta?.total || data?.totalDoctors || 0;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const fromItem =
    totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const toItem = Math.min(safeCurrentPage * pageSize, totalRecords);
  const pageNumbers = buildPageNumbers(safeCurrentPage, totalPages);

  const summary = {
    totalDoctors: data?.summary?.totalDoctors ?? data?.totalDoctors ?? 0,
    totalCharts: data?.summary?.totalCharts ?? data?.totalCharts ?? 0,
    totalSuccess: data?.summary?.totalSuccess ?? data?.totalSuccessCharts ?? 0,
    totalWarning: data?.summary?.totalWarning ?? data?.totalWarningCharts ?? 0,
  };

  const successPercent = getPercent(summary.totalSuccess, summary.totalCharts);
  const warningPercent = getPercent(summary.totalWarning, summary.totalCharts);

  const appliedDateRangeText = `${formatDate(appliedDchdateFrom)} - ${formatDate(
    appliedDchdateTo,
  )}`;

  const appliedFilterText = appliedSearch
    ? `ช่วงวันที่ ${appliedDateRangeText} • ค้นหา: ${appliedSearch}`
    : `ช่วงวันที่ ${appliedDateRangeText}`;

  useEffect(() => {
    if (hasSearched && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, hasSearched, totalPages]);

  const handlePageSizeChange = (nextPageSize: number) => {
    const validSize = PAGE_SIZE_OPTIONS.includes(
      nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? (nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
      : 10;

    setPageSize(validSize);
    setCurrentPage(1);
  };

  return (
    <section className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-blue-100/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 p-4 text-white md:p-6">
            <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-white/10 blur-sm" />
            <div className="absolute right-32 -bottom-24 h-64 w-64 rounded-full bg-cyan-300/15 blur-md" />

            <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur sm:h-14 sm:w-14">
                  <Stethoscope className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                    <BarChart3 size={14} />
                    Doctor Chart Summary
                  </div>
                  <h1 className="text-xl font-black tracking-tight md:text-3xl">
                    ค้นหาแพทย์ที่มีชาร์ต
                  </h1>
                  <p className="mt-1.5 max-w-3xl text-sm leading-6 text-blue-100">
                    โชว์แพทย์ทุกคน พร้อมจำนวนชาร์ตทั้งหมด Success และ Warning
                    โดยเลือกช่วงวันที่ Discharge แล้วกดค้นหา
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-3 shadow-xl shadow-black/10 backdrop-blur-xl xl:min-w-[560px]">
                <div className="grid gap-3 md:grid-cols-2">
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

                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/70" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSearch();
                      }}
                      placeholder="ค้นหาชื่อแพทย์ / รหัสแพทย์ / License"
                      className="h-11 w-full rounded-2xl border border-white/20 bg-white/15 px-4 pl-11 text-sm font-bold text-white backdrop-blur transition outline-none placeholder:text-white/60 focus:border-white/60 focus:ring-4 focus:ring-white/10 dark:bg-slate-950/30"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
                  >
                    <Search size={16} />
                    ค้นหา
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/25"
                  >
                    <X size={16} />
                    ล้าง
                  </button>
                </div>
              </div>
            </div>
          </div>

          {hasSearched && (
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
              <SummaryCard
                title="แพทย์ทั้งหมด"
                value={formatNumber(summary.totalDoctors)}
                subtitle="จำนวนแพทย์ตามเงื่อนไขค้นหา"
                icon={<UserRoundCheck size={20} />}
                tone="indigo"
                loading={isLoading}
              />
              <SummaryCard
                title="ชาร์ตทั้งหมด"
                value={formatNumber(summary.totalCharts)}
                subtitle={appliedDateRangeText}
                icon={<ClipboardCheck size={20} />}
                tone="blue"
                loading={isLoading}
              />
              <SummaryCard
                title="Success"
                value={formatNumber(summary.totalSuccess)}
                subtitle={`${successPercent}% จากชาร์ตทั้งหมด`}
                icon={<CheckCircle2 size={20} />}
                tone="emerald"
                loading={isLoading}
              />
              <SummaryCard
                title="Warning"
                value={formatNumber(summary.totalWarning)}
                subtitle={`${warningPercent}% จากชาร์ตทั้งหมด`}
                icon={<AlertTriangle size={20} />}
                tone="amber"
                loading={isLoading}
              />
            </div>
          )}

          <div className="p-4 md:p-5">
            {!hasSearched ? (
              <InitialState />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : isLoading ? (
              <LoadingState />
            ) : items.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                      รายการชาร์ตแยกตามแพทย์
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      แสดง {formatNumber(fromItem)}-{formatNumber(toItem)}{" "}
                      จากทั้งหมด {formatNumber(totalRecords)} รายการ
                    </p>

                    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                      <CalendarDays size={14} className="shrink-0" />
                      <span className="truncate">{appliedFilterText}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {appliedSearch && (
                      <InfoChip
                        text={`ค้นหา: ${appliedSearch}`}
                        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                      />
                    )}

                    {isFetching && !isLoading && (
                      <InfoChip
                        text="กำลังอัปเดต"
                        icon={
                          <Hourglass className="h-3.5 w-3.5 animate-spin" />
                        }
                        className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                      />
                    )}

                    <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <span className="whitespace-nowrap">แสดง</span>
                      <select
                        value={pageSize}
                        onChange={(event) =>
                          handlePageSizeChange(Number(event.target.value))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm font-black text-slate-700 transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span className="whitespace-nowrap">รายการ</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {items.map((item, index) => (
                    <DoctorChartCard
                      key={`${item.doctor_code}-${item.rank || index}`}
                      item={item}
                      index={
                        (item.rank ||
                          (safeCurrentPage - 1) * pageSize + index + 1) - 1
                      }
                      dateRangeText={appliedDateRangeText}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  pageNumbers={pageNumbers}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
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
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full cursor-pointer rounded-2xl border border-white/20 bg-white/15 px-4 pl-11 text-sm font-bold text-white backdrop-blur transition outline-none focus:border-white/60 focus:ring-4 focus:ring-white/10 dark:bg-slate-950/30"
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

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "blue" | "indigo" | "amber" | "emerald";
  loading: boolean;
}) {
  const toneClass = {
    blue: {
      bar: "from-blue-500 to-indigo-500",
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    },
    indigo: {
      bar: "from-indigo-500 to-violet-500",
      icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    },
    amber: {
      bar: "from-amber-500 to-orange-500",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    },
    emerald: {
      bar: "from-emerald-500 to-teal-500",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800/70">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${toneClass.bar}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass.icon}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
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

function DoctorChartCard({
  item,
  index,
  dateRangeText,
}: {
  item: DoctorChartItem;
  index: number;
  dateRangeText: string;
}) {
  const totalValue = Number(item.total || 0);
  const successValue = Number(item.success || 0);
  const warningValue = Number(item.warning || 0);
  const successPercent = getPercent(successValue, totalValue);
  const warningPercent = getPercent(warningValue, totalValue);

  return (
    <article className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm shadow-slate-100/70 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4 dark:border-slate-700 dark:bg-slate-950/50 dark:shadow-black/20">
      <div className="grid gap-4 2xl:grid-cols-[minmax(260px,390px)_minmax(260px,1fr)_minmax(240px,280px)] 2xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <span className="text-sm font-black">#{index + 1}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base leading-snug font-black text-slate-950 sm:text-lg dark:text-white">
              {item.doctor_name || "ไม่พบชื่อแพทย์"}
            </h3>
            <p className="mt-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              Code: {item.doctor_code || "-"}
              {item.doctor_license ? ` • License: ${item.doctor_license}` : ""}
            </p>

            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <CalendarDays size={12} className="shrink-0" />
              <span className="truncate">{dateRangeText}</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <MetricBar
            label="Success chart"
            value={successValue}
            percent={successPercent}
            width={successPercent}
            barClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
          />

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <MiniProgress
              label="Total"
              value={totalValue}
              percent={100}
              width={totalValue > 0 ? 100 : 0}
              barClassName="bg-slate-400 dark:bg-slate-500"
            />
            <MiniProgress
              label="Warning"
              value={warningValue}
              percent={warningPercent}
              width={warningPercent}
              barClassName="bg-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 2xl:min-w-[260px]">
          <StatTile
            label="Success"
            value={successValue}
            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          />
          <StatTile
            label="Warning"
            value={warningValue}
            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          />
          <StatTile
            label="Total"
            value={totalValue}
            className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          />
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
  const safeWidth = clampPercent(width);
  const safePercent = clampPercent(percent);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <span className="shrink-0 text-sm font-black text-slate-500 dark:text-slate-400">
          {formatNumber(value)} รายการ • {safePercent}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClassName}`}
          style={{ width: `${safeWidth}%` }}
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
  const safeWidth = clampPercent(width);
  const safePercent = clampPercent(percent);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {formatNumber(value)} ({safePercent}%)
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClassName}`}
          style={{ width: `${safeWidth}%` }}
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`flex min-h-[68px] flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center ${className}`}
    >
      <p className="text-2xl leading-none font-black sm:text-3xl">
        {formatNumber(value)}
      </p>
      <p className="mt-1.5 text-[10px] font-black tracking-wide uppercase sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 lg:flex-row dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
        หน้า {formatNumber(currentPage)} จาก {formatNumber(totalPages)}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <PaginationButton
          label="หน้าแรก"
          icon={<ChevronsLeft size={16} />}
          disabled={isFirstPage}
          onClick={() => onPageChange(1)}
        />
        <PaginationButton
          label="ก่อนหน้า"
          icon={<ChevronLeft size={16} />}
          disabled={isFirstPage}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        />

        <div className="flex items-center gap-1">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-9 min-w-9 rounded-xl px-3 text-sm font-black transition ${
                page === currentPage
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:bg-blue-500 dark:shadow-blue-950/40"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <PaginationButton
          label="ถัดไป"
          icon={<ChevronRight size={16} />}
          iconRight
          disabled={isLastPage}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        />
        <PaginationButton
          label="หน้าสุดท้าย"
          icon={<ChevronsRight size={16} />}
          iconRight
          disabled={isLastPage}
          onClick={() => onPageChange(totalPages)}
        />
      </div>
    </div>
  );
}

function PaginationButton({
  label,
  icon,
  iconRight,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  iconRight?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
    >
      {!iconRight && icon}
      <span className="hidden sm:inline">{label}</span>
      {iconRight && icon}
    </button>
  );
}

function InfoChip({
  text,
  className,
  icon,
}: {
  text: string;
  className: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${className}`}
    >
      {icon}
      {text}
    </div>
  );
}

function InitialState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 px-5 py-16 text-center text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-slate-900">
        <FileSearch className="h-7 w-7" />
      </div>
      <p className="text-lg font-black">เลือกช่วงวันที่แล้วกดค้นหา</p>
      <p className="mt-2 max-w-xl text-sm leading-6 opacity-80">
        ระบบจะแสดงแพทย์ทุกคน พร้อมจำนวนชาร์ตทั้งหมด Success และ Warning
        หลังจากกดปุ่มค้นหาเท่านั้น
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <Hourglass className="mb-3 h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="font-bold">กำลังโหลดข้อมูลชาร์ตแพทย์...</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        กรุณารอสักครู่
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 py-16 text-center text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <AlertTriangle size={40} />
      <p className="mt-3 font-black">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="mt-1 text-sm">ไม่สามารถดึงข้อมูลสรุปชาร์ตแพทย์ได้</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
      >
        <RefreshCw size={15} />
        ลองใหม่
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-500">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <UserRoundCheck className="h-7 w-7" />
      </div>
      <p className="font-black">ไม่พบข้อมูลแพทย์</p>
      <p className="mt-1 max-w-md text-sm">
        ลองเปลี่ยนช่วงวันที่ หรือค้นหาด้วยชื่อ/รหัสแพทย์ใหม่อีกครั้ง
      </p>
    </div>
  );
}
