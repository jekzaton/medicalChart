"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { timeAgo } from "@/lib/moment";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Loader2,
  OctagonX,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import ConfirmModal from "../ui/modal/confirmModal";

type User = {
  id: number;
  username: string;
  cid?: string | null;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  role: "user" | "admin" | string;
  active: boolean;
  updatedAt: string | Date;
};

type CurrentUser = {
  id: number;
  username?: string;
  role?: string;
};

const getFullName = (user: User) => {
  const fullName = `${user.prefix || ""} ${user.firstname || ""} ${
    user.lastname || ""
  }`.trim();

  return fullName || "-";
};

const getInitial = (user?: User | null) => {
  const value = user?.firstname || user?.username || "U";
  return value.trim().charAt(0).toUpperCase() || "U";
};

const getRoleClassName = (role: string) => {
  if (role === "admin") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
};

const getRoleLabel = (role: string) => {
  if (role === "admin") return "ผู้ดูแลระบบ";
  if (role === "user") return "ผู้ใช้งาน";
  return role;
};

export default function TableUser() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get("/api/users", {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch,
        },
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      setUsers(res.data?.data || []);
      setTotalPages(Math.max(res.data?.meta?.totalPages || 1, 1));
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error(err);
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUsers((prev) => [...prev]);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get("/api/auth/me", {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        setCurrentUser(res.data?.user || res.data || null);
      } catch {
        toast.error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
      }
    };

    fetchMe();
  }, []);

  const handleToggleActive = async (user: User) => {
    if (!currentUser) return;

    if (user.id === currentUser.id && user.active) {
      toast.warning("ไม่สามารถปิดการใช้งานตัวเองได้");
      return;
    }

    const newStatus = !user.active;
    setUpdatingId(user.id);

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, active: newStatus } : item,
      ),
    );

    try {
      await axios.patch(`/api/users/${user.id}`, { active: newStatus });
      toast.success("อัปเดตสถานะแล้ว");
      fetchUsers();
    } catch {
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, active: user.active } : item,
        ),
      );
      toast.error("อัปเดตไม่สำเร็จ");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEdit = (user: User) => {
    router.push(`/admin/users/edit/${user.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      toast.warning("ไม่สามารถลบผู้ใช้งานของตัวเองได้");
      return;
    }

    try {
      setDeletingId(selectedUser.id);
      await axios.delete(`/api/users/${selectedUser.id}`);

      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      setTotal((prev) => Math.max(prev - 1, 0));

      toast.success("ลบสำเร็จ");
      setOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
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

  const hasSearch = Boolean(debouncedSearch);

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
                  <Users className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-sm font-bold text-blue-100">
                    User Management
                  </p>
                  <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                    จัดการผู้ใช้งาน
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
                    ค้นหา แก้ไข ลบ และเปิด/ปิดสถานะผู้ใช้งานในระบบ
                  </p>
                </div>
              </div>

              <Link
                href="/admin/users/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-blue-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:bg-slate-950/90 dark:text-blue-300 dark:hover:bg-slate-900"
              >
                <UserPlus size={18} />
                เพิ่มผู้ใช้
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
                placeholder="ค้นหา username, ชื่อ หรือนามสกุล..."
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

          {loading && <LoadingState />}
          {!loading && error && (
            <ErrorState message={error} onRetry={fetchUsers} />
          )}

          {!loading && !error && (
            <>
              <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-800/80 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-4 text-left font-black">
                          ผู้ใช้งาน
                        </th>
                        <th className="px-4 py-4 text-left font-black">
                          เลขบัตร
                        </th>
                        <th className="px-4 py-4 text-left font-black">Role</th>
                        <th className="px-4 py-4 text-center font-black">
                          สถานะ
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
                      {users.map((user, index) => (
                        <UserTableRow
                          key={user.id}
                          user={user}
                          index={index}
                          currentUserId={currentUser?.id}
                          updatingId={updatingId}
                          onToggle={handleToggleActive}
                          onEdit={handleEdit}
                          onDelete={(selected) => {
                            setSelectedUser(selected);
                            setOpen(true);
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && <EmptyState />}
              </div>

              <div className="grid gap-4 lg:hidden">
                {users.length === 0 ? (
                  <EmptyState />
                ) : (
                  users.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUserId={currentUser?.id}
                      updatingId={updatingId}
                      onToggle={handleToggleActive}
                      onEdit={handleEdit}
                      onDelete={(selected) => {
                        setSelectedUser(selected);
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
          setOpen(false);
          setSelectedUser(null);
        }}
        title="ยืนยันการลบผู้ใช้"
        description={
          <div className="text-left">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณกำลังจะลบผู้ใช้งานนี้:
            </p>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 font-black text-red-600 dark:bg-red-500/15 dark:text-red-300">
                  {getInitial(selectedUser)}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-slate-800 dark:text-slate-100">
                    {selectedUser ? getFullName(selectedUser) : "-"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    @{selectedUser?.username}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
              ⚠️ การลบนี้ไม่สามารถกู้คืนได้
            </div>
          </div>
        }
        confirmText={deletingId === selectedUser?.id ? "กำลังลบ..." : "ลบเลย"}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function UserTableRow({
  user,
  index,
  currentUserId,
  updatingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  user: User;
  index: number;
  currentUserId?: number;
  updatingId: number | null;
  onToggle: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const isSelf = user.id === currentUserId;

  return (
    <tr
      className={`transition-colors ${
        index % 2 === 0
          ? "bg-white dark:bg-slate-900"
          : "bg-slate-50/70 dark:bg-slate-900/70"
      } hover:bg-blue-50/60 dark:hover:bg-blue-500/10`}
    >
      <td className="px-4 py-4">
        <UserIdentity user={user} showUsername />
      </td>

      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
        {user.cid || "-"}
      </td>

      <td className="px-4 py-4">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-4 py-4 text-center">
        <ActiveToggle
          active={user.active}
          disabled={updatingId === user.id || (isSelf && user.active)}
          loading={updatingId === user.id}
          onClick={() => onToggle(user)}
        />
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
        {timeAgo(user.updatedAt)}
      </td>

      <td className="px-4 py-4">
        <ActionButtons
          user={user}
          isSelf={isSelf}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

function UserCard({
  user,
  currentUserId,
  updatingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  user: User;
  currentUserId?: number;
  updatingId: number | null;
  onToggle: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const isSelf = user.id === currentUserId;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} showUsername />
        <RoleBadge role={user.role} />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/70">
        <InfoLine label="เลขบัตร" value={user.cid || "-"} />
        <InfoLine label="Updated" value={timeAgo(user.updatedAt)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            สถานะ
          </span>
          <ActiveToggle
            active={user.active}
            disabled={updatingId === user.id || (isSelf && user.active)}
            loading={updatingId === user.id}
            onClick={() => onToggle(user)}
          />
        </div>

        <ActionButtons
          user={user}
          isSelf={isSelf}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function UserIdentity({
  user,
  showUsername,
}: {
  user: User;
  showUsername?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 font-black text-white shadow-sm">
        {getInitial(user)}
      </div>

      <div className="min-w-0">
        <p className="truncate font-black text-slate-800 dark:text-slate-100">
          {getFullName(user)}
        </p>
        {showUsername && (
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            @{user.username}
          </p>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${getRoleClassName(
        role,
      )}`}
    >
      {role === "admin" ? <ShieldCheck size={13} /> : <BadgeCheck size={13} />}
      {getRoleLabel(role)}
    </span>
  );
}

function ActiveToggle({
  active,
  disabled,
  loading,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
      title={disabled ? "ไม่สามารถเปลี่ยนสถานะได้" : "เปลี่ยนสถานะ"}
    >
      <span
        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
        )}
      </span>
    </button>
  );
}

function ActionButtons({
  user,
  isSelf,
  onEdit,
  onDelete,
}: {
  user: User;
  isSelf: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(user)}
        className="group inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
        title="แก้ไขข้อมูล"
      >
        <Pencil size={16} className="transition group-hover:scale-110" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(user)}
        disabled={isSelf}
        className="group inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
        title={isSelf ? "ไม่สามารถลบตัวเองได้" : "ลบข้อมูล"}
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 py-20 text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <OctagonX size={42} />
      <p className="mt-3 font-black">เกิดข้อผิดพลาด</p>
      <p className="mt-1 text-sm">{message}</p>
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
      <UserCog className="mb-3 h-10 w-10" />
      <p className="font-black">ไม่พบข้อมูลผู้ใช้งาน</p>
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
          {[10, 20, 50, 100].map((size) => (
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
