"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleEditor } from "@/components/simple-editor";
import { ArrowLeftIcon, SaveIcon, SendIcon } from "lucide-react";
import Link from "next/link";

interface PostData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  is_published: boolean;
}

export default function EditPostClient({
  initialData,
  isNew,
}: {
  initialData?: PostData;
  isNew: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<PostData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    is_published: initialData?.is_published || false,
  });

  // Auto-generate slug from title with date prefix (year/month/day/name)
  useEffect(() => {
    if (isNew && post.title) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const name = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = `${year}/${month}/${day}/${name}`;
      setPost((prev) => ({ ...prev, slug }));
    }
  }, [post.title, isNew]);

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    try {
      const url = isNew ? "/api/posts" : `/api/posts/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          is_published: publish,
        }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link href="/admin">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <SendIcon className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <Input
          type="text"
          value={post.title}
          onChange={(e) => setPost({ ...post, title: e.target.value })}
          placeholder="Blog title..."
          className="text-3xl font-bold h-auto py-2 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:ring-offset-0"
        />

        {/* Slug Preview */}
        {(() => {
          const now = new Date();
          const datePrefix = `${now.getFullYear()}/${String(
            now.getMonth() + 1
          ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
          const slugName = post.title
            ? post.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
            : "post-slug";
          return (
            <div className="text-sm text-muted-foreground">
              <span>preview: </span>
              <span className="font-mono">
                /blog/{datePrefix}/{slugName}
              </span>
            </div>
          );
        })()}

        {/* Description */}
        <Input
          type="text"
          value={post.description}
          onChange={(e) => setPost({ ...post, description: e.target.value })}
          placeholder="Brief description..."
          className="text-muted-foreground border-none shadow-none focus-visible:ring-0 focus-visible:ring-primary focus-visible:ring-offset-0"
        />

        {/* WYSIWYG Editor */}
        <SimpleEditor
          content={post.content}
          onChange={(content) => setPost({ ...post, content })}
        />
      </div>
    </div>
  );
}
