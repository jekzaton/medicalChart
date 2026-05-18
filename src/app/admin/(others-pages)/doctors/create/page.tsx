import CreateDoctorComponent from "@/components/doctor/CreateDoctor";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Doctor Create",
  description: "YTH Medical Record - Create Doctor",
};

export default function CreateUser() {
  return (
    <div>
      <CreateDoctorComponent />
    </div>
  );
}
