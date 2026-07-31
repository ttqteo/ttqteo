import {
  createSupabaseServerClient,
  getUser,
  isAdmin,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/posts/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT /api/posts/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, slug, description, content, is_published, deleted_at, type, tags, guide_section, guide_order } = body;

  const supabase = await createSupabaseServerClient();

  const basePayload: Record<string, unknown> = {
    title,
    slug,
    description,
    content: content || null,
    is_published,
    deleted_at,
    updated_at: new Date().toISOString(),
  };

  const tryUpdate = (payload: Record<string, unknown>) =>
    supabase.from("blogs").update(payload).eq("id", id).select().single();

  const withType = type !== undefined ? { type } : {};
  const withTags = typeof tags === "string" ? { tags } : {};
  const withGuide = {
    ...(guide_section !== undefined ? { guide_section } : {}),
    ...(guide_order !== undefined ? { guide_order } : {}),
  };

  let { data, error } = await tryUpdate({
    ...basePayload,
    ...withType,
    ...withTags,
    ...withGuide,
  });

  // Retry strategy when PostgREST schema cache is stale or columns are missing.
  if (error && /guide_(section|order)/i.test(error.message)) {
    ({ data, error } = await tryUpdate({ ...basePayload, ...withType, ...withTags }));
  }
  if (error && /['"]?tags['"]? column|column .*tags.* does not exist/i.test(error.message)) {
    ({ data, error } = await tryUpdate({ ...basePayload, ...withType }));
  }
  if (error && /['"]?type['"]? column|column .*type.* does not exist/i.test(error.message)) {
    ({ data, error } = await tryUpdate({ ...basePayload, ...withTags }));
  }
  if (error && /column/i.test(error.message)) {
    // Last resort: drop both optional columns
    ({ data, error } = await tryUpdate(basePayload));
  }

  if (error) {
    console.error("[posts PUT] supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/posts/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isPermanent = searchParams.get("permanent") === "true";

  const supabase = await createSupabaseServerClient();
  let error;

  if (isPermanent) {
    const { error: deleteError } = await supabase
      .from("blogs")
      .delete()
      .eq("id", id);
    error = deleteError;
  } else {
    const { error: updateError } = await supabase
      .from("blogs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    error = updateError;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
