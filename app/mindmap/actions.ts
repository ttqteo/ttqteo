"use server";

import fs from "fs/promises";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MindmapItem } from "./types";

export async function getMindmaps(shareCode?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !shareCode) return [];

  let query = supabase
    .from("mindmaps")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (user && shareCode) {
    query = query.or(`user_id.eq.${user.id},share_code.eq.${shareCode}`);
  } else if (user) {
    query = query.eq("user_id", user.id);
  } else if (shareCode) {
    query = query.eq("share_code", shareCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching mindmaps:", error);
    return [];
  }

  return data.map((m) => {
    let trees: any[] = [];
    if (Array.isArray(m.tree)) {
      trees = m.tree;
    } else if (m.tree && typeof m.tree === "object") {
      trees = [m.tree];
    }

    return {
      id: m.id,
      name: m.name,
      trees: trees,
      renderMode: m.render_mode,
      createdAt: new Date(m.created_at).getTime(),
      updatedAt: new Date(m.updated_at).getTime(),
    };
  }) as MindmapItem[];
}

export async function upsertMindmap(mindmap: MindmapItem, shareCode?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !shareCode)
    return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("mindmaps").upsert({
    id: mindmap.id,
    user_id: user?.id || null,
    share_code: shareCode || null,
    name: mindmap.name,
    tree: mindmap.trees,
    render_mode: mindmap.renderMode,
    updated_at: new Date(mindmap.updatedAt).toISOString(),
    created_at: new Date(mindmap.createdAt).toISOString(),
    is_deleted: false,
  });

  if (error) {
    console.error("Error upserting mindmap:", error);
    return { success: false, error };
  }

  return { success: true };
}

export async function upsertMindmaps(
  mindmaps: MindmapItem[],
  shareCode?: string
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !shareCode)
    return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("mindmaps").upsert(
    mindmaps.map((m) => ({
      id: m.id,
      user_id: user?.id || null,
      share_code: shareCode || null,
      name: m.name,
      tree: m.trees,
      render_mode: m.renderMode,
      updated_at: new Date(m.updatedAt).toISOString(),
      created_at: new Date(m.createdAt).toISOString(),
      is_deleted: false,
    }))
  );

  if (error) {
    console.error("Error upserting mindmaps:", error);
    return { success: false, error };
  }

  return { success: true };
}

export async function deleteMindmapSync(id: string, shareCode?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !shareCode)
    return { success: false, error: "Not authenticated" };

  let query = supabase
    .from("mindmaps")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (user) {
    query = query.eq("user_id", user.id);
  } else if (shareCode) {
    query = query.eq("share_code", shareCode);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting mindmap:", error);
    return { success: false, error };
  }

  return { success: true };
}

export async function getMindmapDocs() {
  const docsDir = path.join(process.cwd(), "docs", "mindmap");
  try {
    const files = await fs.readdir(docsDir);
    const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

    const docs = await Promise.all(
      mdxFiles.map(async (file) => {
        const content = await fs.readFile(path.join(docsDir, file), "utf-8");
        return {
          name: file.replace(".mdx", ""),
          title: file
            .replace(".mdx", "")
            .split("-")
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" "),
          content,
        };
      })
    );

    // Define the desired order for better UX (README first, then beginner-friendly order)
    const order = [
      "README",
      "keyboard-shortcuts",
      "multi-root",
      "node-notes",
      "modes",
      "design-philosophy",
      "node-types",
      "render-rules",
    ];

    // Sort docs according to the order array
    docs.sort((a, b) => {
      const aIndex = order.indexOf(a.name);
      const bIndex = order.indexOf(b.name);

      // If both are in order array, sort by order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is in order, put it first
      if (aIndex !== -1) return -1;
      // If only b is in order, put it first
      if (bIndex !== -1) return 1;
      // If neither is in order, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    return docs;
  } catch (error) {
    console.error("Error reading mindmap docs:", error);
    return [];
  }
}
