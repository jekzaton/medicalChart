import TableMedicalUser from "@/components/medicalChart/TableMedicalUser";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medical Chart User",
  description: "Medical Chart User",
};

export default function MedicalChartUserPage() {
  return (
    <div>
      <TableMedicalUser />
    </div>
  );
}
