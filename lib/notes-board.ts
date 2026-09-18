import { foldText, type AdminNote } from "@/lib/admin-notes";
import { decodeEntities } from "@/lib/unfurl";

/**
 * The notes page (/admin/notes) shows two kinds of note on one board: the
 * quick notes of Ghi nhanh, and the private notes written inside posts. This
 * turns both into one list of cards, searched and sorted together. Pure.
 */

/** A post with private notes, as lib/posts's getPostsWithPrivateNotes returns it. */
export type PostNoteSource = {
  id: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
  /** Each note's HTML, in the order they sit in the post. */
  notes: string[];
};

export type BoardFilter = "all" | "quick" | "post";

export type BoardItem =
  | { kind: "quick"; key: string; note: AdminNote }
  | { kind: "post"; key: string; post: PostNoteSource; html: string; index: number };

/** The words of a note's HTML, for searching it: tags gone, entities read, spaces collapsed. */
export function htmlText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const matches = (text: string, terms: string[]) => {
  const folded = foldText(text);
  return terms.every((term) => folded.includes(term));
};

const stamp = (iso: string) => Date.parse(iso) || 0;

const editedAt = (item: BoardItem) =>
  item.kind === "quick" ? stamp(item.note.updated_at) : stamp(item.post.updatedAt);

/**
 * Pinned quick notes first, in their own group; then everything else, both
 * kinds together, most recently edited first. A post's notes each get a card
 * and keep their order in the post. `query` is matched word by word, ignoring
 * case and marks, against a quick note's text or a post note's text and title.
 */
export function boardItems(
  notes: AdminNote[],
  posts: PostNoteSource[],
  { query, filter }: { query: string; filter: BoardFilter },
): { pinned: BoardItem[]; others: BoardItem[] } {
  const terms = foldText(query).split(/\s+/).filter(Boolean);

  const quick: BoardItem[] =
    filter === "post"
      ? []
      : notes
          .filter((note) => matches(note.body, terms))
          .map((note) => ({ kind: "quick", key: `quick:${note.id}`, note }));

  const inPosts: BoardItem[] =
    filter === "quick"
      ? []
      : posts.flatMap((post) =>
          post.notes
            .map((html, index) => ({
              kind: "post" as const,
              key: `post:${post.id}:${index}`,
              post,
              html,
              index,
            }))
            .filter((item) => matches(`${post.title} ${htmlText(item.html)}`, terms)),
        );

  const newestFirst = (a: BoardItem, b: BoardItem) => editedAt(b) - editedAt(a);
  const isPinned = (item: BoardItem) => item.kind === "quick" && item.note.pinned;
  return {
    pinned: quick.filter(isPinned).sort(newestFirst),
    others: [...quick.filter((item) => !isPinned(item)), ...inPosts].sort(newestFirst),
  };
}
