"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type LoginUser = {
  id?: number;
  username?: string | null;
  email?: string | null;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  role?: string | null;
  image?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  photo?: string | null;
};

const getFullName = (user: LoginUser | null) => {
  if (!user) return "ผู้ใช้งาน";

  const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim();

  return fullName || user.username || "ผู้ใช้งาน";
};

const getDisplayRole = (role?: string | null) => {
  if (role === "admin") return "ผู้ดูแลระบบ";
  if (role === "user") return "ผู้ใช้งาน";
  return role || "ผู้ใช้งาน";
};

const getInitial = (user: LoginUser | null) => {
  const value = user?.firstname || user?.username || getFullName(user);
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
};

const getAvatarUrl = (user: LoginUser | null) => {
  return user?.avatarUrl || user?.avatar || user?.image || user?.photo || "";
};

export default function UserDropdown() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = useMemo(() => getFullName(currentUser), [currentUser]);
  const displayRole = useMemo(
    () => getDisplayRole(currentUser?.role),
    [currentUser?.role],
  );
  const profileHref =
    currentUser?.role === "user" ? "/user/profile" : "/admin/profile";

  const avatarUrl = useMemo(() => getAvatarUrl(currentUser), [currentUser]);
  const initial = useMemo(() => getInitial(currentUser), [currentUser]);

  const subtitle = currentUser?.email || currentUser?.username || displayRole;

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      closeDropdown();

      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        setCurrentUser(data?.user ?? data);
      } catch (error) {
        console.error("FETCH CURRENT USER ERROR:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="dropdown-toggle group flex items-center gap-3 rounded-2xl px-1.5 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800/80"
      >
        <Avatar
          avatarUrl={avatarUrl}
          imageError={imageError}
          setImageError={setImageError}
          initial={initial}
          size="md"
        />

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[140px] truncate text-sm font-bold text-slate-800 dark:text-slate-100">
            {displayName}
          </p>
          <p className="max-w-[140px] truncate text-xs font-medium text-slate-400 dark:text-slate-500">
            {displayRole}
          </p>
        </div>

        <ChevronDown
          className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block dark:text-slate-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-4 flex w-[300px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 shadow-slate-300/40 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40 dark:ring-white/10"
      >
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 p-4 text-white">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute right-12 -bottom-10 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3">
            <Avatar
              avatarUrl={avatarUrl}
              imageError={imageError}
              setImageError={setImageError}
              initial={initial}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{displayName}</p>
              {/* <p className="mt-0.5 truncate text-xs font-medium text-blue-100">
                {subtitle}
              </p> */}

              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold ring-1 ring-white/15 backdrop-blur">
                <ShieldCheck size={13} />
                {displayRole}
              </div>
            </div>
          </div>
        </div>

        <ul className="mt-2 flex flex-col gap-1 border-b border-slate-100 pb-2 dark:border-slate-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={profileHref}
              className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:group-hover:bg-blue-500/20">
                <UserRound size={18} />
              </span>
              <span>
                <span className="block">โปรไฟล์ของฉัน</span>
                <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                  ดูและแก้ไขข้อมูลส่วนตัว
                </span>
              </span>
            </DropdownItem>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500/20">
            <LogOut size={18} />
          </span>
          <span>{loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}</span>
        </button>
      </Dropdown>
    </div>
  );
}

function Avatar({
  avatarUrl,
  imageError,
  setImageError,
  initial,
  size,
}: {
  avatarUrl: string;
  imageError: boolean;
  setImageError: (value: boolean) => void;
  initial: string;
  size: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-14 w-14" : "h-11 w-11";

  if (!avatarUrl || imageError) {
    return (
      <span
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg ring-1 shadow-blue-500/20 ring-white/20`}
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} relative shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700`}
    >
      <Image
        src={avatarUrl}
        alt="User"
        fill
        sizes={size === "lg" ? "56px" : "44px"}
        unoptimized
        onError={() => setImageError(true)}
        className="object-cover"
      />
    </span>
  );
}
