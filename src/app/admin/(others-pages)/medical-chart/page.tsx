import TableMedicalChart from "@/components/medicalChart/TableMedical";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH-Medical Chart",
  description: "YTH Medical Record - Medical Chart",
};

export default function DoctorPage() {
  return (
    <div>
      <TableMedicalChart />
    </div>
  );
}
