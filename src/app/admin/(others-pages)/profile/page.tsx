import type { Metadata } from "next";

import ProfileCard from "@/components/user-profile/ProfileCard";

export const metadata: Metadata = {
  title: "YTH Profile",
  description: "Medical Record YTH Profile",
};

export default function Profile() {
  return (
    <main className="min-h-screen w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
        <section className="mx-auto w-full max-w-6xl">
          <ProfileCard />
        </section>
      </div>
    </main>
  );
}
