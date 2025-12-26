"use server";

import { Footer } from "@/components/footer";
import { isAdmin } from "@/lib/supabase-server";
import { AdminToolbar } from "@/components/admin-toolbar";
import { Navbar } from "@/components/navbar";
import { PropsWithChildren } from "react";

export default async function Template({ children }: PropsWithChildren) {
  const admin = await isAdmin();

  return (
    <div className={`min-h-screen flex flex-col ${admin ? "pt-10" : ""}`}>
      <div className="focus-mode-hidden">
        <AdminToolbar />
      </div>
      <div className="focus-mode-hidden">
        <Navbar />
      </div>
      <main className="sm:container mx-auto w-[90vw] h-auto scroll-smooth flex-1">
        {children}
      </main>
      <div className="focus-mode-hidden">
        <Footer />
      </div>
    </div>
  );
}
