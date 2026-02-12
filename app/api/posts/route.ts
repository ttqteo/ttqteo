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
  const { title, slug, description, content, is_published } = body;

  if (!title || !slug) {
    return NextResponse.json(
      { error: "Title and slug are required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Use safeFetch to prevent timeout errors
  const result = await safeFetch(async () => {
    const { data, error } = await supabase
      .from("blogs")
      .insert({
        title,
        slug,
        description,
        content: content || "",
        is_published,
        author_id: user.id,
      })
      .select()
      .single();

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
