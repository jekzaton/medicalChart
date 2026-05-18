import TableUser from "@/components/users/TableUser";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Medical Manage",
  description: "YTH Medical Record - Users",
};

export default function Users() {
  return (
    <div>
      <TableUser />
    </div>
  );
}
