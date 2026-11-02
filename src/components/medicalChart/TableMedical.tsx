"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileWarning,
  Hourglass,
  Loader2,
  OctagonX,
  Pencil,
  Search,
  Send,
  Stethoscope,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/moment";

type ChartStatus = "SUCCESS" | "WARNING" | "success" | "warning";
type SortOrder = "asc" | "desc";
type SortBy =
  | "hn"
  | "an"
  | "fullname"
  | "regdate"
  | "dchdate"
  | "doctor_code"
  | "num_date"
  | "status_chart";

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
  doctor_name?: string | null;
  doctor?: Doctor | null;
  num_date: number;
  status_chart: ChartStatus;
  created_at?: string | Date;
  updated_at?: string | Date;
};

type MedicalChartResponse = {
  data: MedicalChart[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

type SortableHeaderProps = {
  label: string;
  sortKey: SortBy;
  activeSortBy: SortBy;
  sortOrder: SortOrder;
  align?: "left" | "center";
  className?: string;
  onSort: (key: SortBy) => void;
};

const getStatusConfig = (status?: ChartStatus) => {
  const normalizedStatus = String(status || "warning").toLowerCase();

  if (normalizedStatus === "success") {
    return {
      label: "สรุปเรียบร้อย",
      icon: CheckCircle2,
      className:
        "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
    };
  }

  return {
    label: "รอสรุป",
    icon: FileWarning,
    className:
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
  };
};

type TableMedicalState = {
  currentPage: number;
  pageSize: number;
  search: string;
  searchDoctor: string;
  dchdateFrom: string;
  dchdateTo: string;
  appliedSearch: string;
  appliedSearchDoctor: string;
  appliedDchdateFrom: string;
  appliedDchdateTo: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const TABLE_MEDICAL_STATE_KEY = "table-medical-chart-state";

const SORT_BY_VALUES: SortBy[] = [
  "hn",
  "an",
  "fullname",
  "regdate",
  "dchdate",
  "doctor_code",
  "num_date",
  "status_chart",
];

const defaultTableMedicalState: TableMedicalState = {
  currentPage: 1,
  pageSize: 10,
  search: "",
  searchDoctor: "",
  dchdateFrom: "",
  dchdateTo: "",
  appliedSearch: "",
  appliedSearchDoctor: "",
  appliedDchdateFrom: "",
  appliedDchdateTo: "",
  sortBy: "dchdate",
  sortOrder: "desc",
};

const getInitialTableMedicalState = (): TableMedicalState => {
  if (typeof window === "undefined") return defaultTableMedicalState;

  try {
    const saved = sessionStorage.getItem(TABLE_MEDICAL_STATE_KEY);
    if (!saved) return defaultTableMedicalState;

    const parsed = JSON.parse(saved) as Partial<TableMedicalState>;

    return {
      ...defaultTableMedicalState,
      ...parsed,
      currentPage:
        typeof parsed.currentPage === "number" && parsed.currentPage > 0
          ? parsed.currentPage
          : defaultTableMedicalState.currentPage,
      pageSize:
        typeof parsed.pageSize === "number" && parsed.pageSize > 0
          ? parsed.pageSize
          : defaultTableMedicalState.pageSize,
      sortBy: SORT_BY_VALUES.includes(parsed.sortBy as SortBy)
        ? (parsed.sortBy as SortBy)
        : defaultTableMedicalState.sortBy,
      sortOrder:
        parsed.sortOrder === "asc" || parsed.sortOrder === "desc"
          ? parsed.sortOrder
          : defaultTableMedicalState.sortOrder,
    };
  } catch {
    return defaultTableMedicalState;
  }
};

function SortableHeader({
  label,
  sortKey,
  activeSortBy,
  sortOrder,
  align = "left",
  className = "",
  onSort,
}: SortableHeaderProps) {
  const active = activeSortBy === sortKey;
  const Icon = active
    ? sortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className={`px-4 py-4 font-semibold whitespace-nowrap ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex items-center gap-1.5 rounded-xl px-2 py-1 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 ${
          active
            ? "text-blue-700 dark:text-blue-300"
            : "text-slate-500 dark:text-slate-400"
        } ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        <span>{label}</span>
        <Icon
          size={14}
          className={`transition ${
            active ? "opacity-100" : "opacity-40 group-hover:opacity-100"
          }`}
        />
      </button>
    </th>
  );
}

export default function TableMedicalChart() {
  const router = useRouter();

  const initialTableState = useMemo(() => getInitialTableMedicalState(), []);

  const [currentPage, setCurrentPage] = useState(initialTableState.currentPage);
  const [pageSize, setPageSize] = useState(initialTableState.pageSize);

  const [search, setSearch] = useState(initialTableState.search);
  const [searchDoctor, setSearchDoctor] = useState(
    initialTableState.searchDoctor,
  );
  const [dchdateFrom, setDchdateFrom] = useState(initialTableState.dchdateFrom);
  const [dchdateTo, setDchdateTo] = useState(initialTableState.dchdateTo);

  const [appliedSearch, setAppliedSearch] = useState(
    initialTableState.appliedSearch,
  );
  const [appliedSearchDoctor, setAppliedSearchDoctor] = useState(
    initialTableState.appliedSearchDoctor,
  );
  const [appliedDchdateFrom, setAppliedDchdateFrom] = useState(
    initialTableState.appliedDchdateFrom,
  );
  const [appliedDchdateTo, setAppliedDchdateTo] = useState(
    initialTableState.appliedDchdateTo,
  );

  const [sortBy, setSortBy] = useState<SortBy>(initialTableState.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialTableState.sortOrder,
  );

  const [deleteTarget, setDeleteTarget] = useState<MedicalChart | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [sendingLine, setSendingLine] = useState(false);

  const dchdateFromRef = useRef<HTMLInputElement | null>(null);
  const dchdateToRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const state: TableMedicalState = {
      currentPage,
      pageSize,
      search,
      searchDoctor,
      dchdateFrom,
      dchdateTo,
      appliedSearch,
      appliedSearchDoctor,
      appliedDchdateFrom,
      appliedDchdateTo,
      sortBy,
      sortOrder,
    };

    sessionStorage.setItem(TABLE_MEDICAL_STATE_KEY, JSON.stringify(state));
  }, [
    currentPage,
    pageSize,
    search,
    searchDoctor,
    dchdateFrom,
    dchdateTo,
    appliedSearch,
    appliedSearchDoctor,
    appliedDchdateFrom,
    appliedDchdateTo,
    sortBy,
    sortOrder,
  ]);

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

  const handleApplyFilters = () => {
    setAppliedSearch(search);
    setAppliedDchdateFrom(dchdateFrom);
    setAppliedDchdateTo(dchdateTo);
    setCurrentPage(1);
  };
  const handleApplyFiltersDoctor = () => {
    setAppliedSearchDoctor(searchDoctor);
    setAppliedDchdateFrom(dchdateFrom);
    setAppliedDchdateTo(dchdateTo);
    setCurrentPage(1);
  };

  const handleSort = (key: SortBy) => {
    setCurrentPage(1);

    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortOrder(
      key === "dchdate" || key === "regdate" || key === "num_date"
        ? "desc"
        : "asc",
    );
  };

  const handleExportExcel = async () => {
    const getHeaderString = (value: unknown) => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.join("; ");
      return "";
    };
    if (dchdateFrom && dchdateTo && dchdateFrom > dchdateTo) {
      toast.warning("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    try {
      setExporting(true);

      const res = await axios.get("/api/medical-charts/export", {
        params: {
          search: search,
          searchDoctor: searchDoctor,
          dchdateFrom,
          dchdateTo,
          sortBy,
          sortOrder,
        },
        responseType: "blob",
      });

      const contentDisposition = res.headers["content-disposition"] || "";

      const contentType =
        getHeaderString(res.headers["content-type"]) ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const fileNameMatch = contentDisposition.match(
        /filename\*=UTF-8''([^;]+)/,
      );

      const fileName = fileNameMatch?.[1]
        ? decodeURIComponent(fileNameMatch[1])
        : `medical-chart-${dchdateFrom || "all"}-to-${dchdateTo || "all"}.xlsx`;

      const blob = new Blob([res.data], {
        type: contentType,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Export Excel สำเร็จ");
    } catch (err: any) {
      console.error(err);

      try {
        const blob = err?.response?.data;

        if (blob instanceof Blob) {
          const text = await blob.text();
          const json = JSON.parse(text);
          toast.error(json?.message || "Export Excel ไม่สำเร็จ");
          return;
        }
      } catch {
        // ignore parse error
      }

      toast.error("Export Excel ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = (chart: MedicalChart) => {
    router.push(`/admin/medical-chart/edit/${chart.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await axios.delete(`/api/medical-charts/${deleteTarget.id}`);
      toast.success("ลบข้อมูลสำเร็จ");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("ลบข้อมูลไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  const clearDateFilter = () => {
    setDchdateFrom("");
    setDchdateTo("");
    setAppliedDchdateFrom("");
    setAppliedDchdateTo("");
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setSearchDoctor("");
    setDchdateFrom("");
    setDchdateTo("");
    setAppliedSearch("");
    setAppliedSearchDoctor("");
    setAppliedDchdateFrom("");
    setAppliedDchdateTo("");
    setCurrentPage(1);
  };

  const queryKey = useMemo(
    () => [
      "medical-charts",
      currentPage,
      pageSize,
      appliedSearch,
      appliedSearchDoctor,
      appliedDchdateFrom,
      appliedDchdateTo,
      sortBy,
      sortOrder,
    ],
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedSearchDoctor,
      appliedDchdateFrom,
      appliedDchdateTo,
      sortBy,
      sortOrder,
    ],
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useQuery<MedicalChartResponse>({
      queryKey,
      queryFn: async () => {
        const res = await axios.get("/api/medical-charts", {
          params: {
            page: currentPage,
            limit: pageSize,
            search: appliedSearch || undefined, // ถ้าว่างไม่ส่ง
            searchDoctor: appliedSearchDoctor || undefined, // ถ้าไม่ค้นแพทย์ก็ไม่ส่ง
            dchdateFrom: appliedDchdateFrom,
            dchdateTo: appliedDchdateTo,
            sortBy,
            sortOrder,
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

  const charts = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const total = data?.meta?.total || 0;

  const hasSearch = Boolean(appliedSearch);
  const hasSearchDoctor = Boolean(appliedSearchDoctor);
  const hasDateFilter = Boolean(appliedDchdateFrom || appliedDchdateTo);
  const hasAnyFilter = hasSearch || hasDateFilter;
  const hasAnySearchDoctor = hasSearchDoctor || hasDateFilter;

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    const pages: number[] = [];
    const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    const adjustedStart = Math.max(1, end - maxVisible + 1);

    for (let page = adjustedStart; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [currentPage, totalPages]);

  const handleSendLineSummary = async () => {
    const selectedDchdateFrom = appliedDchdateFrom || dchdateFrom;
    const selectedDchdateTo = appliedDchdateTo || dchdateTo;
    const selectedSearch = appliedSearch || search;
    const selectedSearchDoctor = appliedSearchDoctor || searchDoctor;

    // ตรวจสอบวันเริ่มต้นไม่เกินวันสิ้นสุด
    if (
      selectedDchdateFrom &&
      selectedDchdateTo &&
      selectedDchdateFrom > selectedDchdateTo
    ) {
      toast.warning("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    try {
      setSendingLine(true);

      // เรียก API ใหม่ที่ปรับแล้ว (line-summary)
      const res = await axios.post("/api/medical-charts/line-summary", {
        search: selectedSearch, // HN / AN / ชื่อผู้ป่วย
        searchDoctor: selectedSearchDoctor, // ชื่อ / รหัส / license แพทย์
        dchdateFrom: selectedDchdateFrom,
        dchdateTo: selectedDchdateTo,
      });

      // แจ้งผล
      toast.success(res.data?.message || "ส่ง LINE สรุปแพทย์สำเร็จ");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "ส่ง LINE ไม่สำเร็จ");
    } finally {
      setSendingLine(false);
    }
  };

  const filteredCharts = charts;
  const displayCount = total;
  // const displayCount = hasAnyFilter || hasAnySearchDoctor ? total : total;

  const handleSearch = () => {
    handleApplyFilters?.();
    handleApplyFiltersDoctor?.();
  };

  return (
    <div className="w-full overflow-hidden text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-[calc(100vw-2rem)] space-y-6 xl:max-w-7xl">
        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-xl shadow-blue-100/40 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="relative overflow-hidden bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 text-white md:p-6 dark:from-blue-700 dark:via-indigo-800 dark:to-violet-800">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute right-28 -bottom-14 h-40 w-40 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur">
                  <Activity className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-100">
                    Medical Chart
                  </p>
                  <h1 className="truncate text-2xl font-bold md:text-3xl">
                    จัดการ Chart
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    ตรวจสอบรายการ Admit / Discharge และสถานะการตรวจสอบเวชระเบียน
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                <Link
                  href="/admin/medical-chart/import"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 sm:w-auto dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition group-hover:scale-110 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <FileSpreadsheet size={17} />
                  </span>
                  Import Excel
                  <Upload size={16} className="opacity-80" />
                </Link>
                <button
                  type="button"
                  onClick={handleSendLineSummary}
                  disabled={sendingLine}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition group-hover:scale-110">
                    {sendingLine ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}
                  </span>
                  {sendingLine ? "Waiting LINE..." : "Send LINE"}
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition group-hover:scale-110">
                    {exporting ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={17} />
                    )}
                  </span>

                  {exporting ? "กำลัง Export..." : "Export Excel"}

                  {!exporting && <Download size={16} className="opacity-90" />}
                </button>

                <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium text-white backdrop-blur sm:w-auto">
                  <CalendarDays size={16} />
                  ทั้งหมด {total.toLocaleString()} รายการ
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-4xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-100/70 transition-colors sm:p-5 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="mb-6 space-y-4">
            <div className="grid gap-4 2xl:grid-cols-[1fr_auto] 2xl:items-end">
              <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(320px,0.95fr)] lg:items-end">
                <div className="relative min-w-0">
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    ค้นหา
                  </label>
                  <Search className="pointer-events-none absolute top-10.75 left-4 h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="ค้นหา HN, AN, ชื่อผู้ป่วย"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyFilters();
                    }}
                    className="h-14.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 pl-12 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 dark:focus:ring-blue-500/20"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute top-9.5 right-3 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      aria-label="ล้างคำค้นหา"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="relative min-w-0">
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    ค้นหาแพทย์
                  </label>

                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="ค้นหาชื่อแพทย์..."
                      value={searchDoctor}
                      onChange={(e) => setSearchDoctor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyFiltersDoctor();
                      }}
                      className="h-14.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 pl-12 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 dark:focus:ring-blue-500/20"
                    />

                    {searchDoctor && (
                      <button
                        type="button"
                        onClick={() => setSearchDoctor("")}
                        className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    ช่วงวันที่ Discharge
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="relative min-w-0">
                      <input
                        ref={dchdateFromRef}
                        type="date"
                        value={dchdateFrom}
                        onChange={(e) => setDchdateFrom(e.target.value)}
                        className="h-14.5 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-4 pl-12 text-sm text-slate-900 shadow-sm transition outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                      />

                      <button
                        type="button"
                        onClick={() => openDatePicker(dchdateFromRef.current)}
                        className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                        aria-label="เลือกวันที่เริ่มต้น Discharge"
                      >
                        <CalendarDays size={18} />
                      </button>
                    </div>

                    <div className="relative min-w-0">
                      <input
                        ref={dchdateToRef}
                        type="date"
                        value={dchdateTo}
                        onChange={(e) => setDchdateTo(e.target.value)}
                        className="h-14.5 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-4 pl-12 text-sm text-slate-900 shadow-sm transition outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                      />

                      <button
                        type="button"
                        onClick={() => openDatePicker(dchdateToRef.current)}
                        className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                        aria-label="เลือกวันที่สิ้นสุด Discharge"
                      >
                        <CalendarDays size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] 2xl:h-14.5 2xl:min-w-105 2xl:items-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl sm:w-auto dark:bg-blue-500 dark:shadow-blue-950/40 dark:hover:bg-blue-400"
                >
                  <Search size={16} />
                  ค้นหา
                </button>

                <div className="inline-flex h-12 min-w-0 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <div className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    {/* <span>{hasAnyFilter || hasAnySearchDoctor ? "พบผลลัพธ์" : "ทั้งหมด"}</span> */}
                    <span>
                      {hasAnySearchDoctor
                        ? "ผลค้นหาแพทย์"
                        : hasAnyFilter
                          ? "พบผลลัพธ์"
                          : "ทั้งหมด"}
                    </span>
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-100 px-2 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {displayCount.toLocaleString()}
                    </span>
                    <span>รายการ</span>
                  </div>

                  <div className="h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

                  <div className="inline-flex h-7 shrink-0 items-center rounded-full bg-blue-100 px-3 text-xs font-bold whitespace-nowrap text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    หน้า {currentPage} / {totalPages}
                  </div>
                </div>

                {isFetching && !isLoading && (
                  <div className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 text-xs font-medium text-blue-700 sm:col-span-2 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                    <Hourglass className="h-4 w-4 animate-spin" />
                    กำลังอัปเดต
                  </div>
                )}
              </div>
            </div>

            {(hasAnyFilter || hasAnySearchDoctor) && (
              <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  ตัวกรองที่ใช้
                </span>

                {hasSearch && (
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <span className="truncate">ค้นหา: {appliedSearch}</span>
                  </span>
                )}
                {hasSearchDoctor && (
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <span className="truncate">
                      ค้นหา: {appliedSearchDoctor}
                    </span>
                  </span>
                )}

                {hasDateFilter && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Discharge:{" "}
                    {appliedDchdateFrom
                      ? formatDate(appliedDchdateFrom)
                      : "เริ่มต้น"}{" "}
                    -{" "}
                    {appliedDchdateTo
                      ? formatDate(appliedDchdateTo)
                      : "ปัจจุบัน"}
                  </span>
                )}

                {hasDateFilter && (
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X size={13} />
                    ล้างวันที่
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <X size={13} />
                  ล้างทั้งหมด
                </button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-20 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Hourglass className="mb-3 h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="font-medium">กำลังโหลดข้อมูล...</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                กรุณารอสักครู่
              </p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 py-20 text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <OctagonX size={42} />
              <p className="mt-3 font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
              <p className="mt-1 text-sm">
                ไม่สามารถดึงข้อมูล Medical Chart ได้
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="w-full overflow-x-auto">
                <table className="min-w-300 text-sm lg:min-w-full">
                  <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                    <tr>
                      <SortableHeader
                        label="HN"
                        sortKey="hn"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="AN"
                        sortKey="an"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="ชื่อ - สกุล"
                        sortKey="fullname"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        className="min-w-55"
                      />
                      <SortableHeader
                        label="วัน Admit"
                        sortKey="regdate"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="วัน Discharge"
                        sortKey="dchdate"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="ชื่อแพทย์"
                        sortKey="doctor_code"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        className="min-w-55"
                      />
                      <SortableHeader
                        label="จำนวนวันล่าช้า"
                        sortKey="num_date"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        align="center"
                      />
                      <SortableHeader
                        label="สถานะ"
                        sortKey="status_chart"
                        activeSortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        align="center"
                      />
                      <th className="sticky right-0 z-10 bg-slate-50 px-4 py-4 text-center font-semibold whitespace-nowrap text-slate-500 shadow-[-12px_0_20px_-20px_rgba(15,23,42,0.45)] dark:bg-slate-800 dark:text-slate-400">
                        จัดการ
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCharts.map((chart, index) => {
                      const status = getStatusConfig(chart.status_chart);
                      const StatusIcon = status.icon;

                      const doctorName =
                        chart.doctor_name ||
                        chart.doctor?.name ||
                        chart.doctor_code ||
                        "-";

                      const diffDays = Math.floor(
                        (Date.now() - new Date(chart.dchdate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );

                      const lateDays = Math.max(diffDays - 7, 0);

                      // 👉 อันนี้คือ “วันล่าช้าจริง”
                      const num_date = lateDays;

                      return (
                        <tr
                          key={chart.id}
                          className={`transition-colors ${
                            index % 2 === 0
                              ? "bg-white dark:bg-slate-900"
                              : "bg-slate-50/70 dark:bg-slate-900/70"
                          } hover:bg-blue-50/60 dark:hover:bg-blue-500/10`}
                        >
                          <td className="px-4 py-4 font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100">
                            {chart.hn || "-"}
                          </td>

                          <td className="px-4 py-4 font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
                            {chart.an || "-"}
                          </td>

                          <td className="min-w-55 px-4 py-4 text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                                <UserRound size={17} />
                              </div>
                              <span className="font-medium">
                                {chart.fullname || "-"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {formatDate(chart.regdate)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {formatDate(chart.dchdate)}
                          </td>

                          <td className="min-w-55 px-4 py-4 text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                <Stethoscope size={17} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">{doctorName}</p>
                                {chart.doctor_code && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Code: {chart.doctor_code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-all duration-200 ease-in-out ${
                                chart.status_chart?.toUpperCase() === "SUCCESS"
                                  ? "bg-green-100 text-green-800 shadow-sm ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/20"
                                  : Number(num_date) > 0
                                    ? "bg-amber-100 text-amber-700 shadow-sm ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20"
                                    : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                              } `}
                            >
                              {chart.status_chart?.toUpperCase() ===
                              "SUCCESS" ? (
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                `${Number(num_date || 0)} วัน`
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}
                            >
                              <StatusIcon size={14} />
                              {status.label}
                            </span>
                          </td>

                          <td
                            className={`sticky right-0 z-10 px-4 py-4 text-center whitespace-nowrap shadow-[-12px_0_20px_-20px_rgba(15,23,42,0.45)] ${
                              index % 2 === 0
                                ? "bg-white dark:bg-slate-900"
                                : "bg-slate-50 dark:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(chart)}
                                className="group rounded-xl bg-blue-50 p-2 text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                                title="แก้ไขข้อมูล"
                              >
                                <Pencil
                                  size={16}
                                  className="transition group-hover:scale-110"
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(chart)}
                                className="group rounded-xl bg-red-50 p-2 text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                                title="ลบข้อมูล"
                              >
                                <Trash2
                                  size={16}
                                  className="transition group-hover:scale-110"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredCharts.length === 0 && (
                <div className="flex flex-col items-center justify-center bg-white py-16 text-center text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                  <OctagonX className="mb-3 h-10 w-10" />
                  <p className="font-medium">ไม่พบข้อมูล Medical Chart</p>
                  <p className="mt-1 text-sm">
                    ลองเปลี่ยนคำค้นหาหรือตรวจสอบข้อมูลอีกครั้ง
                  </p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !isError && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                แสดง
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                >
                  {[10, 20, 30, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                รายการ
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {/* ปุ่มไปหน้าสุด */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronFirst />
                </button>

                {/* ปุ่มย้อนกลับ */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* ปุ่มเลขหน้า */}
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:bg-blue-500 dark:shadow-blue-950/40"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* ปุ่มถัดไป */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronRight size={16} />
                </button>

                {/* ปุ่มไปหน้าหลังสุด */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLast />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <Trash2 size={22} />
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              ยืนยันการลบ Medical Chart
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              ต้องการลบข้อมูล AN “{deleteTarget.an}” ของ “
              {deleteTarget.fullname}” ใช่หรือไม่?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    HN
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {deleteTarget.hn || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    AN
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {deleteTarget.an || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    ชื่อ - สกุล
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {deleteTarget.fullname || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleting ? "กำลังลบ..." : "ลบข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
