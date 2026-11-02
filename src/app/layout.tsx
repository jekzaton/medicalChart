"use client";

import { Outfit, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ToastProvider from "@/components/ToastProvider";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { useState } from "react";
import { cn } from "@/lib/utils";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap", // ✅ ป้องกัน font กระตุก
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ กัน QueryClient reset ทุก render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 นาที
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", notoSans.variable, playfairDisplayHeading.variable)}>
      <body className={`${outfit.className} bg-gray-100 dark:bg-gray-900`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SidebarProvider>
              {/* Layout */}
              {children}

              {/* Toast */}
              <ToastProvider />

              {/* Devtools (dev เท่านั้น) */}
              {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </SidebarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
