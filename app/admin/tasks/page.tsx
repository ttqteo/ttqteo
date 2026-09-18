import { getUser, isAdmin } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TasksPage } from "./tasks-page";

export const dynamic = "force-dynamic";

/** The Task panel as a page, with a full column for the titles. */
export default async function AdminTasksPage() {
  // /admin already renders the sign-in and unauthorized screens.
  if (!(await getUser()) || !(await isAdmin())) redirect("/admin");
  return <TasksPage />;
}
