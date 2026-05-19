import DoctorChartCM from "@/components/doctorChart/DoctorChartCM";
import TableMedicalChart from "@/components/medicalChart/TableMedical";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Doctor Chart",
  description: "YTH Medical Doctor Chart",
};

export default function DoctorChartPage() {
  return (
    <div>
      <DoctorChartCM />
    </div>
  );
}
