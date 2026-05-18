"use client";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { Menu, MoreVertical, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

function LogoImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div
        className={`flex h-10 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-slate-800 dark:bg-slate-800 dark:text-slate-100 ${className}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-xs font-black text-white">
          Y
        </span>
        <span className="text-sm font-black tracking-tight">YTH</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={120}
      height={30}
      priority
      onError={() => setImageError(true)}
      className={`h-auto w-[120px] object-contain ${className}`}
    />
  );
}

const AppHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl transition-colors dark:bg-slate-950/80">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            {isMobileOpen ? (
              <X className="h-5 w-5 transition group-hover:scale-110" />
            ) : (
              <Menu className="h-5 w-5 transition group-hover:scale-110" />
            )}
          </button>

          <Link href="/admin/dashboard" className="lg:hidden">
            <LogoImage
              src="/images/logo/logo.svg"
              alt="logo"
              className="dark:hidden"
            />
            <LogoImage
              src="/images/logo/logo-dark.svg"
              alt="logo"
              className="hidden dark:flex"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* <div className="hidden items-center gap-2 rounded-2xl bg-white/70 p-1 shadow-sm backdrop-blur sm:flex dark:bg-slate-900/70"> */}
          <div className="hidden items-center gap-2 p-1 sm:flex">
            <ThemeToggleButton />
            {/* <NotificationDropdown /> */}
            <UserDropdown />
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="เปิดเมนูเพิ่มเติม"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700 sm:hidden dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            {isMenuOpen ? <X size={19} /> : <MoreVertical size={19} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="bg-white/95 px-4 py-3 shadow-lg shadow-slate-200/30 backdrop-blur-xl sm:hidden dark:bg-slate-950/95 dark:shadow-black/20">
          <div className="flex items-center justify-end gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-900">
            <ThemeToggleButton />
            {/* <NotificationDropdown /> */}
            <UserDropdown />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppHeader;
