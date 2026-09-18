import { getUser, isAdmin } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CalendarPage } from "./calendar-page";

export const dynamic = "force-dynamic";

/** The Calendar panel with room: a month grid with the events written in. */
export default async function AdminCalendarPage() {
  // /admin already renders the sign-in and unauthorized screens.
  if (!(await getUser()) || !(await isAdmin())) redirect("/admin");
  return <CalendarPage />;
}
