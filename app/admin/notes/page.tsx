import { getPostsWithPrivateNotes } from "@/lib/posts";
import { getUser, isAdmin } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { NotesBoard } from "./notes-board";

export const dynamic = "force-dynamic";

/**
 * Every note on one board: the quick notes of Ghi nhanh, which the board
 * reads from the side panel's store, and the private notes inside posts,
 * read here on the server and handed to it.
 */
export default async function AdminNotesPage() {
  // /admin already renders the sign-in and unauthorized screens.
  if (!(await getUser()) || !(await isAdmin())) redirect("/admin");

  const posts = await getPostsWithPrivateNotes();
  return <NotesBoard posts={posts} />;
}
