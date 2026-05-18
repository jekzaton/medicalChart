import EditMedical from "@/components/medicalChart/EditMedical";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Medical Chart Edit",
  description: "YTH Medical Record - Edit Medical Chart",
};

export default function EditMedicalChart() {
  return (
    <div>
      <EditMedical />
    </div>
  );
}
