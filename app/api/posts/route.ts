import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import { safeFetch } from "@/lib/supabase-safe-fetch";
import { NextRequest, NextResponse } from "next/server";

// GET /api/posts - List all posts (for admin)
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  // Use safeFetch to prevent timeout errors
  const result = await safeFetch(async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data;
  });

  if (!result.success) {
    // Return 503 (Service Unavailable) instead of 500 when DB is waking up
    const status = result.error === "timeout" ? 503 : 500;
    return NextResponse.json(
      {
        error: result.message,
        code: result.error
      },
      { status }
    );
  }

  return NextResponse.json(result.data);
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, slug, description, content, is_published, type, tags, guide_section, guide_order } = body;

  if (!title || !slug) {
    return NextResponse.json(
      { error: "Title and slug are required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const basePayload: Record<string, unknown> = {
    title,
    slug,
    description,
    content: content || "",
    is_published,
    author_id: user.id,
  };

  const tryInsert = (payload: Record<string, unknown>) =>
    supabase.from("blogs").insert(payload).select().single();

  const tagsValue = typeof tags === "string" ? tags : undefined;
  const withGuide = {
    ...(guide_section !== undefined ? { guide_section } : {}),
    ...(guide_order !== undefined ? { guide_order } : {}),
  };

  // Use safeFetch to prevent timeout errors
  const result = await safeFetch(async () => {
    let payload: Record<string, unknown> = {
      ...basePayload,
      type: type || "post",
      ...(tagsValue !== undefined ? { tags: tagsValue } : {}),
      ...withGuide,
    };
    let { data, error } = await tryInsert(payload);
    if (error && /guide_(section|order)/i.test(error.message)) {
      payload = {
        ...basePayload,
        type: type || "post",
        ...(tagsValue !== undefined ? { tags: tagsValue } : {}),
      };
      ({ data, error } = await tryInsert(payload));
    }
    if (error && /['"]?tags['"]? column|column .*tags.* does not exist/i.test(error.message)) {
      payload = { ...basePayload, type: type || "post" };
      ({ data, error } = await tryInsert(payload));
    }
    if (error && /['"]?type['"]? column|column .*type.* does not exist/i.test(error.message)) {
      payload = { ...basePayload, ...(tagsValue !== undefined ? { tags: tagsValue } : {}) };
      ({ data, error } = await tryInsert(payload));
    }
    if (error && /column/i.test(error.message)) {
      ({ data, error } = await tryInsert(basePayload));
    }
    if (error) throw error;
    return data;
  });

  if (!result.success) {
    const status = result.error === "timeout" ? 503 : 500;
    return NextResponse.json(
      {
        error: result.message,
        code: result.error
      },
      { status }
    );
  }

  return NextResponse.json(result.data);
}
