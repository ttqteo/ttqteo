import { getUser, isAdmin } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuickNotesPage } from "./quick-notes-page";

export const dynamic = "force-dynamic";

/** Ghi nhanh as a page: the cards in a grid, the note being edited beside them. */
export default async function AdminQuickNotesPage() {
  // /admin already renders the sign-in and unauthorized screens.
  if (!(await getUser()) || !(await isAdmin())) redirect("/admin");
  return <QuickNotesPage />;
}
