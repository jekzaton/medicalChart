import type { Metadata } from "next";

import DashboardCM from "@/components/Dashboard/DashboardCM";

export const metadata: Metadata = {
  title: "YTH Dashboard",
  description: "Medical Chart Dashboard YTH",
};

export default function DashboardPage() {
  return <DashboardCM />;
}
