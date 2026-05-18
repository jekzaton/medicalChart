import DashboardUser from "@/components/Dashboard/DashboardUser";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Dashboard User",
  description: "Medical Chart Dashboard YTH",
};

export default function DashboardPage() {
  return <DashboardUser />;
}
