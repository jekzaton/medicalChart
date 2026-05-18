"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { timeAgo } from "@/lib/moment";
import {
  BadgeCheck,
  BellRing,
  BellOff,
  ChevronLeft,
  ChevronRight,
  FileBadge,
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

import ConfirmModal from "../ui/modal/confirmModal";

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

const getInitial = (doctor?: Doctor | null) => {
  const value = doctor?.name || doctor?.doctorId || "D";
  return value.trim().charAt(0).toUpperCase() || "D";
};

const isOn = (value?: boolean | null) => Boolean(value);

export default function TableDoctor() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
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

    onSuccess: (_data, variables) => {
      toast.success(
        variables.field === "line_active"
          ? "อัปเดตสถานะรับ LINE แล้ว"
          : "อัปเดตสถานะแพทย์แล้ว",
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/doctors/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("ลบสำเร็จ");
      setOpen(false);
      setSelectedDoctor(null);
    },

    onError: () => {
      toast.error("ลบไม่สำเร็จ");
    },
  });

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
            line_active: false, // ✅ Active เป็น N แล้ว LINE เป็น N อัตโนมัติ
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
  const handleEdit = (doctor: Doctor) => {
    router.push(`/admin/doctors/edit/${doctor.id}`);
  };

  const handleConfirmDelete = () => {
    if (!selectedDoctor) return;
    deleteMutation.mutate(selectedDoctor.id);
  };

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

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-xl shadow-blue-100/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white md:p-7">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-sm" />
            <div className="absolute right-24 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-sm" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
                  <Stethoscope className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-sm font-bold text-blue-100">
                    Doctor Management
                  </p>
                  <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                    จัดการแพทย์
                  </h1>
                  {/* <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
                    ค้นหา แก้ไข ลบ เปิด/ปิดสถานะแพทย์ และเปิด/ปิดรับแจ้งเตือน
                    LINE
                  </p> */}
                </div>
              </div>

              <Link
                href="/admin/doctors/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
              >
                <UserPlus size={18} />
                เพิ่มชื่อแพทย์
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-100/70 transition-colors sm:p-5 md:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหารหัสแพทย์ ชื่อ เลขบัตร หรือ License..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 pl-12 text-sm font-medium text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 dark:focus:ring-blue-500/20"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="ล้างคำค้นหา"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isFetching && !isLoading && (
                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 text-xs font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  <Hourglass className="h-4 w-4 animate-spin" />
                  กำลังอัปเดต
                </div>
              )}

              <div className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {hasSearch ? "พบผลลัพธ์" : "ทั้งหมด"}
                <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {total.toLocaleString()}
                </span>
                รายการ
              </div>

              <div className="inline-flex h-11 items-center rounded-full border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                หน้า {currentPage} / {totalPages}
              </div>
            </div>
          </div>

          {isLoading && <LoadingState />}
          {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

          {!isLoading && !isError && (
            <>
              <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-4 text-left font-black">
                          แพทย์
                        </th>
                        <th className="px-4 py-4 text-left font-black">
                          รหัสแพทย์
                        </th>
                        <th className="px-4 py-4 text-left font-black">
                          เลขบัตร
                        </th>
                        <th className="px-4 py-4 text-left font-black">
                          License
                        </th>
                        <th className="px-4 py-4 text-center font-black">
                          Active
                        </th>
                        <th className="px-4 py-4 text-center font-black">
                          LINE
                        </th>
                        <th className="px-4 py-4 text-left font-black">
                          Updated
                        </th>
                        <th className="px-4 py-4 text-center font-black">
                          จัดการ
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {doctors.map((doctor, index) => (
                        <DoctorTableRow
                          key={doctor.id}
                          doctor={doctor}
                          index={index}
                          updatingId={toggleMutation.variables?.id}
                          updatingField={toggleMutation.variables?.field}
                          isUpdating={toggleMutation.isPending}
                          onToggleActive={handleToggleActive}
                          onToggleLineActive={handleToggleLineActive}
                          onEdit={handleEdit}
                          onDelete={(selected) => {
                            setSelectedDoctor(selected);
                            setOpen(true);
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {doctors.length === 0 && <EmptyState />}
              </div>

              <div className="grid gap-4 lg:hidden">
                {doctors.length === 0 ? (
                  <EmptyState />
                ) : (
                  doctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      updatingId={toggleMutation.variables?.id}
                      updatingField={toggleMutation.variables?.field}
                      isUpdating={toggleMutation.isPending}
                      onToggleActive={handleToggleActive}
                      onToggleLineActive={handleToggleLineActive}
                      onEdit={handleEdit}
                      onDelete={(selected) => {
                        setSelectedDoctor(selected);
                        setOpen(true);
                      }}
                    />
                  ))
                )}
              </div>

              <Pagination
                pageSize={pageSize}
                setPageSize={setPageSize}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                pageNumbers={pageNumbers}
              />
            </>
          )}
        </section>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setOpen(false);
          setSelectedDoctor(null);
        }}
        title="ยืนยันการลบแพทย์"
        description={
          <div className="text-left">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณกำลังจะลบข้อมูลแพทย์นี้:
            </p>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 font-black text-red-600 dark:bg-red-500/15 dark:text-red-300">
                  {getInitial(selectedDoctor)}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-slate-800 dark:text-slate-100">
                    {selectedDoctor?.name || "-"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    Code: {selectedDoctor?.doctorId || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
              ⚠️ การลบนี้ไม่สามารถกู้คืนได้
            </div>
          </div>
        }
        confirmText={deleteMutation.isPending ? "กำลังลบ..." : "ลบเลย"}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function DoctorTableRow({
  doctor,
  index,
  updatingId,
  updatingField,
  isUpdating,
  onToggleActive,
  onToggleLineActive,
  onEdit,
  onDelete,
}: {
  doctor: Doctor;
  index: number;
  updatingId?: number;
  updatingField?: ToggleField;
  isUpdating: boolean;
  onToggleActive: (doctor: Doctor) => void;
  onToggleLineActive: (doctor: Doctor) => void;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) {
  const activeUpdating =
    isUpdating && updatingId === doctor.id && updatingField === "active";
  const lineUpdating =
    isUpdating && updatingId === doctor.id && updatingField === "line_active";

  return (
    <tr
      className={`transition-colors ${
        index % 2 === 0
          ? "bg-white dark:bg-slate-900"
          : "bg-slate-50/70 dark:bg-slate-900/70"
      } hover:bg-blue-50/60 dark:hover:bg-blue-500/10`}
    >
      <td className="px-4 py-4">
        <DoctorIdentity doctor={doctor} />
      </td>

      <td className="px-4 py-4 font-black whitespace-nowrap text-slate-700 dark:text-slate-200">
        {doctor.doctorId || "-"}
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
        {doctor.cid || "-"}
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
        {doctor.license || "-"}
      </td>

      <td className="px-4 py-4 text-center">
        <ToggleSwitch
          checked={isOn(doctor.active)}
          loading={activeUpdating}
          disabled={activeUpdating}
          onClick={() => onToggleActive(doctor)}
          onLabel="เปิด"
          offLabel="ปิด"
          activeClassName="bg-emerald-500"
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

      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
        {timeAgo(doctor.updatedAt)}
      </td>

      <td className="px-4 py-4">
        <ActionButtons doctor={doctor} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function DoctorCard({
  doctor,
  updatingId,
  updatingField,
  isUpdating,
  onToggleActive,
  onToggleLineActive,
  onEdit,
  onDelete,
}: {
  doctor: Doctor;
  updatingId?: number;
  updatingField?: ToggleField;
  isUpdating: boolean;
  onToggleActive: (doctor: Doctor) => void;
  onToggleLineActive: (doctor: Doctor) => void;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) {
  const activeUpdating =
    isUpdating && updatingId === doctor.id && updatingField === "active";
  const lineUpdating =
    isUpdating && updatingId === doctor.id && updatingField === "line_active";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <DoctorIdentity doctor={doctor} />
        <div className="flex flex-col items-end gap-2">
          <StatusBadge active={isOn(doctor.active)} />

          <LineBadge
            active={isOn(doctor.active) && isOn(doctor.line_active)}
            hasCid={Boolean(doctor.cid)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/70">
        <InfoLine label="รหัสแพทย์" value={doctor.doctorId || "-"} />
        <InfoLine label="เลขบัตร" value={doctor.cid || "-"} />
        <InfoLine label="License" value={doctor.license || "-"} />
        <InfoLine label="Updated" value={timeAgo(doctor.updatedAt)} />
      </div>

      <div className="mt-4 grid gap-3 rounded-3xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              Active
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              สถานะแพทย์ในระบบ
            </p>
          </div>
          <ToggleSwitch
            checked={isOn(doctor.active)}
            loading={activeUpdating}
            disabled={activeUpdating}
            onClick={() => onToggleActive(doctor)}
            onLabel="เปิด"
            offLabel="ปิด"
            activeClassName="bg-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              LINE
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              รับแจ้งเตือนสรุปชาร์ต
            </p>
          </div>
          <LineToggle
            checked={isOn(doctor.active) && isOn(doctor.line_active)}
            loading={lineUpdating}
            disabled={lineUpdating || !doctor.cid || !isOn(doctor.active)}
            onClick={() => onToggleLineActive(doctor)}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <ActionButtons doctor={doctor} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  );
}

function DoctorIdentity({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 font-black text-white shadow-sm">
        {getInitial(doctor)}
      </div>

      <div className="min-w-0">
        <p className="truncate font-black text-slate-800 dark:text-slate-100">
          {doctor.name || "-"}
        </p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          Code: {doctor.doctorId || "-"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {active ? <BadgeCheck size={13} /> : <ShieldCheck size={13} />}
      {active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
    </span>
  );
}

function LineBadge({ active, hasCid }: { active: boolean; hasCid: boolean }) {
  if (!hasCid) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        <BellOff size={13} />
        ไม่มี CID
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {active ? <BellRing size={13} /> : <BellOff size={13} />}
      {active ? "รับ LINE" : "ไม่รับ LINE"}
    </span>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  loading,
  onClick,
  onLabel,
  offLabel,
  activeClassName = "bg-blue-500",
}: {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  onLabel: string;
  offLabel: string;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
      title={disabled ? "ไม่สามารถเปลี่ยนสถานะได้" : "เปลี่ยนสถานะ"}
    >
      <span
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          checked ? activeClassName : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          )}
        </span>
      </span>
      <span className="hidden min-w-10 text-left text-xs font-black text-slate-500 group-hover:text-slate-700 xl:inline dark:text-slate-400 dark:group-hover:text-slate-200">
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}

function LineToggle({
  checked,
  disabled,
  loading,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
      title={
        disabled
          ? "ต้องเปิด Active และมี CID ก่อน จึงจะเปิดรับ LINE ได้"
          : "เปิด/ปิดรับ LINE"
      }
    >
      <span
        className={`relative inline-flex h-8 w-14 items-center rounded-full p-0.5 shadow-inner transition ${
          checked
            ? "bg-sky-500 shadow-sky-200/70 dark:shadow-sky-950/40"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : checked ? (
            <BellRing className="h-3.5 w-3.5 text-sky-600" />
          ) : (
            <BellOff className="h-3.5 w-3.5 text-slate-500" />
          )}
        </span>
      </span>
    </button>
  );
}

function ActionButtons({
  doctor,
  onEdit,
  onDelete,
}: {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(doctor)}
        className="group inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
        title="แก้ไขข้อมูล"
      >
        <Pencil size={16} className="transition group-hover:scale-110" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(doctor)}
        className="group inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
        title="ลบข้อมูล"
      >
        <Trash2 size={16} className="transition group-hover:scale-110" />
      </button>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-bold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-20 text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <Hourglass className="mb-3 h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="font-bold">กำลังโหลดข้อมูล...</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        กรุณารอสักครู่
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 py-20 text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <OctagonX size={42} />
      <p className="mt-3 font-black">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="mt-1 text-sm">ไม่สามารถดึงข้อมูลแพทย์ได้</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
      >
        ลองใหม่
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center bg-white py-16 text-center text-slate-400 dark:bg-slate-900 dark:text-slate-500">
      <FileBadge className="mb-3 h-10 w-10" />
      <p className="font-black">ไม่พบข้อมูลแพทย์</p>
      <p className="mt-1 text-sm">ลองเปลี่ยนคำค้นหาหรือตรวจสอบข้อมูลอีกครั้ง</p>
    </div>
  );
}

function Pagination({
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  pageNumbers,
}: {
  pageSize: number;
  setPageSize: (value: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  pageNumbers: number[];
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        แสดง
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
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
        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ChevronLeft size={16} />
          ก่อนหน้า
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setCurrentPage(page)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              currentPage === page
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:bg-blue-500 dark:shadow-blue-950/40"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() =>
            setCurrentPage((page) => Math.min(page + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          ถัดไป
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
