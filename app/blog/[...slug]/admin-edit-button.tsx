"use client";

import { buttonVariants } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminEditButton({ slug }: { slug: string }) {
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.id) setEditId(data.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!editId) return null;

  return (
    <Link
      href={`/admin/edit/${editId}`}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "ml-2",
      })}
    >
      <PencilIcon className="w-3.5 h-3.5 mr-1.5" />
      Edit
    </Link>
  );
}
