"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const isSidebarOpen = isExpanded || isHovered;

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900"
      style={
        {
          "--sidebar-width": isMobileOpen
            ? "0px"
            : isSidebarOpen
              ? "280px"
              : "90px",
        } as React.CSSProperties
      }
    >
      {/* Sidebar */}
      <AppSidebar />

      {/* Overlay */}
      <Backdrop />

      {/* Content */}
      <div
        className="flex min-h-screen flex-col transition-all duration-300 ease-in-out"
        style={{
          paddingLeft: "var(--sidebar-width)",
        }}
      >
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/70">
          <AppHeader />
        </header>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">
            <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-gray-200 backdrop-blur dark:bg-gray-800/80 dark:ring-gray-700">
              {children}
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-gray-200 py-3 text-center text-xs text-gray-500 dark:border-gray-800">
          © {new Date().getFullYear()} ต้นไม้ Dev IT
        </footer>
      </div>
    </div>
  );
}
