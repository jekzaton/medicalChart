import TableDoctor from "@/components/doctor/TableDoctor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH-Doctor",
  description: "YTH Medical Record - Doctors",
};

export default function DoctorPage() {
  return (
    <div>
      <TableDoctor />
    </div>
  );
}
