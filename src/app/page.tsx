import { redirect } from "next/navigation";
import SignIn from "./(full-width-pages)/(auth)/signin/page";

export default function Home() {
  redirect("/signin");
}
