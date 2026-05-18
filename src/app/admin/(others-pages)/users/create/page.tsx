import CreateUserComponent from "@/components/users/CreateUser";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "YTH Medical Record",
  description: "YTH Medical Record - Create User",
};

export default function CreateUser() {
  return (
    <div>
      <CreateUserComponent />
    </div>
  );
}
