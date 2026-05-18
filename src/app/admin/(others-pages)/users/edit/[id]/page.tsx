import EditUser from "@/components/users/EditUser";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Medical Record",
  description: "YTH Medical Record - Edit User",
};

export default function Users() {
  return (
    <div>
      <EditUser />
    </div>
  );
}
