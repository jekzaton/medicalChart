import EditDoctor from "@/components/doctor/EditDoctor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Doctor Eidt",
  description: "YTH Medical Record - Edit Doctor",
};

export default function Users() {
  return (
    <div>
      <EditDoctor />
    </div>
  );
}
