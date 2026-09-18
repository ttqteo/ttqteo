import { redirect } from "next/navigation";

/** Ghi nhanh lived here for a day; it is on the notes page now, with the private notes. */
export default function AdminQuickNotesPage() {
  redirect("/admin/notes");
}
