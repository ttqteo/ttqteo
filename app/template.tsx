"use server";

import { Footer } from "@/components/footer";
import { isAdmin } from "@/lib/supabase-server";
import { AdminToolbar } from "@/components/admin-toolbar";
import { Navbar } from "@/components/navbar";
import { PropsWithChildren } from "react";

export default async function Template({ children }: PropsWithChildren) {
  const admin = await isAdmin();

  return (
    <div className={admin ? "pt-8" : ""}>
      <AdminToolbar />
      <Navbar />
      <main className="sm:container mx-auto w-[90vw] h-auto scroll-smooth">
        {children}
      </main>
      <Footer />
    </div>
  );
}
