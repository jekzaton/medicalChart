"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { timeAgo } from "@/lib/moment";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  BadgeCheck,
  BellOff,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hourglass,
  Loader2,
  OctagonX,
  Pencil,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type Doctor = {
  id: number;
  doctorId: string;
  name: string;
  cid?: string | null;
  license: string;
  active: boolean | null;
  line_active: boolean | null;
  updatedAt: string | Date;
};

type DoctorsResponse = {
  data: Doctor[];
  meta?: {
    totalPages?: number;
    total?: number;
    page?: number;
    limit?: number;
  };
};

type ToggleField = "active" | "line_active";

type TogglePayload = {
  id: number;
  field: ToggleField;
  data: Partial<Pick<Doctor, "active" | "line_active">>;
};

type SortKey =
  | "doctorId"
  | "name"
  | "cid"
  | "license"
  | "active"
  | "line_active"
  | "updatedAt";

type SortDirection = "asc" | "desc";

type SortConfig = {
  key: SortKey;
  direction: SortDirection;
} | null;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const getInitial = (doctor?: Doctor | null) => {
  const value = doctor?.name || doctor?.doctorId || "D";
  return value.trim().charAt(0).toUpperCase() || "D";
};

const isOn = (value?: boolean | null) => Boolean(value);

const formatNumber = (value?: number) => Number(value || 0).toLocaleString();

const getDefaultDirection = (key: SortKey): SortDirection => {
  if (key === "updatedAt" || key === "active" || key === "line_active") {
    return "desc";
  }

  return "asc";
};

const getSortText = (doctor: Doctor, key: SortKey) => {
  if (key === "doctorId") return doctor.doctorId || "";
  if (key === "name") return doctor.name || "";
  if (key === "cid") return doctor.cid || "";
  if (key === "license") return doctor.license || "";

  return "";
};

const getSortNumber = (doctor: Doctor, key: SortKey) => {
  if (key === "active") return isOn(doctor.active) ? 1 : 0;
  if (key === "line_active") return isOn(doctor.line_active) ? 1 : 0;
  if (key === "updatedAt") return new Date(doctor.updatedAt).getTime() || 0;

  return 0;
};

const sortDoctors = (rows: Doctor[], sortConfig: SortConfig) => {
  if (!sortConfig) return [...rows];

  const { key, direction } = sortConfig;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (key === "active" || key === "line_active" || key === "updatedAt") {
      const result = getSortNumber(a, key) - getSortNumber(b, key);
      if (result !== 0) return result * multiplier;
    } else {
      const result = getSortText(a, key).localeCompare(getSortText(b, key), "th", {
        numeric: true,
        sensitivity: "base",
      });
      if (result !== 0) return result * multiplier;
    }

    return Number(a.id || 0) - Number(b.id || 0);
  });
};

export default function TableDoctor() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [orderedDoctorIds, setOrderedDoctorIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const queryKey = useMemo(
    () => ["doctors", currentPage, pageSize, debouncedSearch],
    [currentPage, pageSize, debouncedSearch],
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useQuery<DoctorsResponse>({
      queryKey,
      queryFn: async () => {
        const res = await axios.get("/api/doctors", {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch,
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

  const doctors = data?.data || [];
  const totalPages = Math.max(data?.meta?.totalPages || 1, 1);
  const total = data?.meta?.total || 0;
  const hasSearch = Boolean(debouncedSearch);
  const idsSignature = doctors.map((doctor) => doctor.id).join("|");

  useEffect(() => {
    const nextOrder = sortDoctors(doctors, sortConfig).map((doctor) => doctor.id);
    setOrderedDoctorIds(nextOrder);
    // ใช้ idsSignature เป็น dependency เพื่อไม่ให้ toggle active / line_active แล้วเรียงใหม่
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsSignature, sortConfig]);

  const doctorMap = useMemo(() => {
    return new Map(doctors.map((doctor) => [doctor.id, doctor]));
  }, [doctors]);

  const orderedDoctors = useMemo(() => {
    if (orderedDoctorIds.length === 0) return doctors;

    const ordered = orderedDoctorIds
      .map((id) => doctorMap.get(id))
      .filter((doctor): doctor is Doctor => Boolean(doctor));

    const missing = doctors.filter((doctor) => !orderedDoctorIds.includes(doctor.id));

    return [...ordered, ...missing];
  }, [doctorMap, doctors, orderedDoctorIds]);

  const fromItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(currentPage * pageSize, total);

  const toggleMutation = useMutation({
    mutationFn: ({ id, data }: TogglePayload) =>
      axios.patch(`/api/doctors/${id}`, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["doctors"] });

      const previousData = queryClient.getQueryData<DoctorsResponse>(queryKey);

      queryClient.setQueryData<DoctorsResponse>(queryKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data.map((doctor) =>
            doctor.id === id
              ? {
                ...doctor,
                ...data,
                updatedAt: new Date(),
              }
              : doctor,
          ),
        };
      });

      return { previousData };
    },

    onError: (_err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      toast.error(
        variables.field === "line_active"
          ? "อัปเดตสถานะ LINE ไม่สำเร็จ"
          : "อัปเดตสถานะแพทย์ไม่สำเร็จ",
      );
    },

    onSuccess: (response, variables) => {
      const updatedDoctor = response?.data?.doctor as Doctor | undefined;

      if (updatedDoctor?.id) {
        queryClient.setQueryData<DoctorsResponse>(queryKey, (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.map((doctor) =>
              doctor.id === updatedDoctor.id
                ? {
                  ...doctor,
                  ...updatedDoctor,
                }
                : doctor,
            ),
          };
        });
      }

      toast.success(
        variables.field === "line_active"
          ? "อัปเดตสถานะรับ LINE แล้ว"
          : "อัปเดตสถานะแพทย์แล้ว",
      );
    },

    onSettled: () => {
      // ไม่ invalidateQueries หลัง toggle เพื่อไม่ให้ API refetch แล้วเรียงใหม่ตาม updatedAt
      // ข้อมูลบนหน้าจอถูกอัปเดตแบบ optimistic + response จาก PATCH แล้ว
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/doctors/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("ลบข้อมูลแพทย์สำเร็จ");
      setDeleteOpen(false);
      setSelectedDoctor(null);
    },

    onError: () => {
      toast.error("ลบข้อมูลแพทย์ไม่สำเร็จ");
    },
  });

  const handleSort = (key: SortKey) => {
    const nextDirection: SortDirection =
      sortConfig?.key === key
        ? sortConfig.direction === "asc"
          ? "desc"
          : "asc"
        : getDefaultDirection(key);

    const nextSortConfig = {
      key,
      direction: nextDirection,
    };

    setSortConfig(nextSortConfig);
    setOrderedDoctorIds(sortDoctors(doctors, nextSortConfig).map((doctor) => doctor.id));
  };

  const handlePageSizeChange = (nextSize: number) => {
    const validSize = PAGE_SIZE_OPTIONS.includes(
      nextSize as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? (nextSize as (typeof PAGE_SIZE_OPTIONS)[number])
      : 10;

    setPageSize(validSize);
    setCurrentPage(1);
  };

  const handleToggleActive = (doctor: Doctor) => {
    const nextActive = !isOn(doctor.active);

    toggleMutation.mutate({
      id: doctor.id,
      field: "active",
      data: nextActive
        ? {
          active: true,
        }
        : {
          active: false,
          line_active: false,
        },
    });
  };

  const handleToggleLineActive = (doctor: Doctor) => {
    if (!isOn(doctor.active)) {
      toast.warning("ต้องเปิดสถานะ Active ก่อน จึงจะเปิด LINE ได้");
      return;
    }

    if (!doctor.cid) {
      toast.warning("แพทย์คนนี้ยังไม่มี CID สำหรับรับ LINE");
      return;
    }

    toggleMutation.mutate({
      id: doctor.id,
      field: "line_active",
      data: {
        line_active: !isOn(doctor.line_active),
      },
    });
  };

  const handleOpenDelete = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedDoctor || deleteMutation.isPending) return;
    deleteMutation.mutate(selectedDoctor.id);
  };

  return (
    <section className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-blue-100/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white md:p-7">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-24 right-32 h-72 w-72 rounded-full bg-cyan-300/15 blur-md" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="flex min-w-0 items-start gap-4 sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
                <Stethoscope className="h-8 w-8" />
              </div>

              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                  <ShieldCheck size={14} />
                  Doctor Management
                </div>
                <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                  จัดการข้อมูลแพทย์
                </h1>

              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาแพทย์ / CID / License"
                  className="h-12 w-full rounded-2xl border border-white/20 bg-white/15 px-4 pl-11 text-sm font-bold text-white placeholder:text-white/60 outline-none backdrop-blur transition focus:border-white/60 focus:ring-4 focus:ring-white/10 dark:bg-slate-950/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/15 hover:text-white"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <Link
                href="/admin/doctors/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
              >
                <UserPlus size={17} />
                เพิ่มแพทย์
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                รายชื่อแพทย์
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                แสดง {formatNumber(fromItem)}-{formatNumber(toItem)} จากทั้งหมด {formatNumber(total)} รายการ
                {hasSearch ? ` • ค้นหา: ${debouncedSearch}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sortConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setSortConfig(null);
                    setOrderedDoctorIds(doctors.map((doctor) => doctor.id));
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <X size={15} />
                  ล้างการเรียง
                </button>
              )}

              {isFetching && !isLoading && (
                <div className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-3 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <Hourglass className="h-4 w-4 animate-spin" />
                  กำลังอัปเดต
                </div>
              )}

              <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span>แสดง</span>
                <select
                  value={pageSize}
                  onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm font-black text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>รายการ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <LoadingState />
          ) : orderedDoctors.length === 0 ? (
            <EmptyState hasSearch={hasSearch} />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 xl:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-950/70">
                      <tr>
                        <SortableHeader
                          label="แพทย์"
                          sortKey="name"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="รหัสแพทย์"
                          sortKey="doctorId"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="CID"
                          sortKey="cid"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="License"
                          sortKey="license"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Active"
                          sortKey="active"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          align="center"
                        />
                        <SortableHeader
                          label="LINE"
                          sortKey="line_active"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          align="center"
                        />
                        <SortableHeader
                          label="อัปเดตล่าสุด"
                          sortKey="updatedAt"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          จัดการ
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {orderedDoctors.map((doctor) => (
                        <DoctorTableRow
                          key={doctor.id}
                          doctor={doctor}
                          activeUpdating={
                            toggleMutation.isPending &&
                            toggleMutation.variables?.id === doctor.id &&
                            toggleMutation.variables?.field === "active"
                          }
                          lineUpdating={
                            toggleMutation.isPending &&
                            toggleMutation.variables?.id === doctor.id &&
                            toggleMutation.variables?.field === "line_active"
                          }
                          onToggleActive={handleToggleActive}
                          onToggleLineActive={handleToggleLineActive}
                          onDelete={handleOpenDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 xl:hidden">
                {orderedDoctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    activeUpdating={
                      toggleMutation.isPending &&
                      toggleMutation.variables?.id === doctor.id &&
                      toggleMutation.variables?.field === "active"
                    }
                    lineUpdating={
                      toggleMutation.isPending &&
                      toggleMutation.variables?.id === doctor.id &&
                      toggleMutation.variables?.field === "line_active"
                    }
                    onToggleActive={handleToggleActive}
                    onToggleLineActive={handleToggleLineActive}
                    onDelete={handleOpenDelete}
                  />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        open={deleteOpen}
        doctor={selectedDoctor}
        loading={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteOpen(false);
          setSelectedDoctor(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  align?: "left" | "center";
}) {
  const active = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  return (
    <th
      className={`px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 ${align === "center" ? "text-center" : "text-left"
        }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 rounded-xl px-2 py-1 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : ""
          }`}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ArrowUpAZ size={14} />
          ) : (
            <ArrowDownAZ size={14} />
          )
        ) : (
          <ArrowDownUp size={13} className="opacity-60" />
        )}
      </button>
    </th>
  );
}

function DoctorTableRow({
  doctor,
  activeUpdating,
  lineUpdating,
  onToggleActive,
  onToggleLineActive,
  onDelete,
}: {
  doctor: Doctor;
  activeUpdating: boolean;
  lineUpdating: boolean;
  onToggleActive: (doctor: Doctor) => void;
  onToggleLineActive: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) {
  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <DoctorAvatar doctor={doctor} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
              {doctor.name || "ไม่พบชื่อแพทย์"}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              CodeDoctor : {doctor.doctorId}
            </p>
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">
        {doctor.cid || "-"}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">
        {doctor.license || "-"}
      </td>
      <td className="px-4 py-4 text-center">
        <ActiveToggle
          checked={isOn(doctor.active)}
          loading={activeUpdating}
          disabled={activeUpdating}
          onClick={() => onToggleActive(doctor)}
        />
      </td>
      <td className="px-4 py-4 text-center">
        <LineToggle
          checked={isOn(doctor.active) && isOn(doctor.line_active)}
          loading={lineUpdating}
          disabled={lineUpdating || !doctor.cid || !isOn(doctor.active)}
          onClick={() => onToggleLineActive(doctor)}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {timeAgo(doctor.updatedAt)}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/doctors/edit/${doctor.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            aria-label="แก้ไขแพทย์"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(doctor)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            aria-label="ลบแพทย์"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DoctorCard({
  doctor,
  activeUpdating,
  lineUpdating,
  onToggleActive,
  onToggleLineActive,
  onDelete,
}: {
  doctor: Doctor;
  activeUpdating: boolean;
  lineUpdating: boolean;
  onToggleActive: (doctor: Doctor) => void;
  onToggleLineActive: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-950/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DoctorAvatar doctor={doctor} />
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-black text-slate-900 dark:text-white">
              {doctor.name || "ไม่พบชื่อแพทย์"}
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              Code: {doctor.doctorId || "-"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/admin/doctors/edit/${doctor.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(doctor)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBox label="CID" value={doctor.cid || "-"} />
        <InfoBox label="License" value={doctor.license || "-"} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            อัปเดตล่าสุด
          </p>
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {timeAgo(doctor.updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ActiveToggle
            checked={isOn(doctor.active)}
            loading={activeUpdating}
            disabled={activeUpdating}
            onClick={() => onToggleActive(doctor)}
          />
          <LineToggle
            checked={isOn(doctor.active) && isOn(doctor.line_active)}
            loading={lineUpdating}
            disabled={lineUpdating || !doctor.cid || !isOn(doctor.active)}
            onClick={() => onToggleLineActive(doctor)}
          />
        </div>
      </div>
    </article>
  );
}

function DoctorAvatar({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-500/20">
      {getInitial(doctor)}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-black text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function ActiveToggle({
  checked,
  loading,
  disabled,
  onClick,
}: {
  checked: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="เปิด/ปิด Active"
      className={`inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${checked
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
        }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : checked ? (
        <BadgeCheck size={16} />
      ) : (
        <OctagonX size={16} />
      )}
      <span>{checked ? "Y" : "N"}</span>
    </button>
  );
}

function LineToggle({
  checked,
  loading,
  disabled,
  onClick,
}: {
  checked: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? "ต้องเปิด Active และมี CID ก่อน จึงจะเปิดรับ LINE ได้"
          : "เปิด/ปิดรับ LINE"
      }
      className={`inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${checked
        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20"
        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
        }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : checked ? (
        <BellRing size={16} />
      ) : (
        <BellOff size={16} />
      )}
      <span>{checked ? "Y" : "N"}</span>
    </button>
  );
}



function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;
  const pages = buildPaginationPages(currentPage, totalPages);

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70 lg:flex-row">
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
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-9 min-w-9 rounded-xl px-3 text-sm font-black transition ${page === currentPage
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

function buildPaginationPages(currentPage: number, totalPages: number) {
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="font-bold">กำลังโหลดข้อมูลแพทย์...</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        กรุณารอสักครู่
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 py-16 text-center text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <OctagonX size={40} />
      <p className="mt-3 font-black">โหลดข้อมูลแพทย์ไม่สำเร็จ</p>
      <p className="mt-1 text-sm">ไม่สามารถดึงข้อมูลแพทย์ได้</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
      >
        <Loader2 size={15} />
        ลองใหม่
      </button>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-500">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
        <Stethoscope className="h-7 w-7" />
      </div>
      <p className="font-black">ไม่พบข้อมูลแพทย์</p>
      <p className="mt-1 max-w-md text-sm">
        {hasSearch
          ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง"
          : "ยังไม่มีข้อมูลแพทย์ในระบบ"}
      </p>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  doctor,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  doctor: Doctor | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <Trash2 size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ยืนยันการลบข้อมูลแพทย์
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                ต้องการลบข้อมูลของ {doctor?.name || doctor?.doctorId || "แพทย์คนนี้"} ใช่หรือไม่
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            ลบข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}
