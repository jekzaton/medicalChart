import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <ThemeProvider>
        <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
          {children}
          <div className="hidden h-full w-full items-center bg-linear-to-br from-blue-900 via-indigo-900 to-blue-800 lg:grid lg:w-1/2 dark:bg-white/5">
            <div className="relative z-1 flex items-center justify-center">
              <GridShape />

              <div className="flex max-w-2xl flex-col items-center text-center">
                <Link href="/" className="mb-6 block">
                  <Image
                    src="/images/logo/yth_logo.png"
                    alt="Logo"
                    width={800}
                    height={800}
                    className="h-36 w-auto object-contain drop-shadow-xl"
                  />
                </Link>

                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold tracking-wide text-blue-100 shadow-lg shadow-black/10 backdrop-blur">
                    Medical Record Tracking System
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl whitespace-nowrap leading-tight font-black tracking-tight text-white drop-shadow-sm">
                      ระบบติดตามการสรุปเวชระเบียนผู้ป่วยใน
                    </h1>

                    <p className="text-base leading-relaxed font-semibold text-blue-100/90">
                      โรงพยาบาลยางตลาด
                    </p>
                  </div>

                  <div className="mx-auto h-1 w-20 rounded-full bg-linear-to-r from-cyan-300 via-blue-300 to-indigo-300 shadow-lg shadow-blue-500/30" />
                </div>
              </div>
            </div>
          </div>

          <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
