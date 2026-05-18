import type { Metadata } from "next";

import DoctorTop10Chart from "@/components/Dashboard/DoctorTop10Chart";

export const metadata: Metadata = {
  title: "YTH Dashboard Top 10 Doctor",
  description: "Medical Chart Dashboard YTH",
};

export default function Top10DoctorPage() {
  return <DoctorTop10Chart />;
}
