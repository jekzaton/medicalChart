import ImportMedicalChart from "@/components/medicalChart/ImportMedicat";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH-Medical Chart",
  description: "YTH Medical Record - Medical Chart Import",
};

export default function ImportPage() {
  return (
    <div>
      <ImportMedicalChart />
    </div>
  );
}
