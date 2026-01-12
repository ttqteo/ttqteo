"use client";

import { EyeIcon, HeartIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface BlogStats {
  views: number;
  likes: number;
}

const Views = ({
  slug,
  isDetail = false,
  isPublished = false,
  viewOnly = false,
}: {
  slug: string;
  isDetail?: boolean;
  isPublished?: boolean;
  viewOnly?: boolean;
}) => {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const hasViewedRef = useRef(false);
  const [isLiking, setIsLiking] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const fetchAndMaybeIncrement = async () => {
      const { data } = await supabase
        .from("blogs")
        .select("views, likes")
        .eq("slug", slug)
        .maybeSingle();

      let currentViews = data?.views ?? 0;
      let currentLikes = data?.likes ?? 0;

      // If this is detail page and published, increment view
      if (!hasViewedRef.current && isDetail && isPublished) {
        // Optimistic update - show incremented value immediately
        currentViews += 1;
        hasViewedRef.current = true;

        // Increment in background (with error logging)
        supabase
          .rpc("increment_views", { blog_slug: slug })
          .then(({ error }) => {
            if (error) {
              console.error("Failed to increment views:", error);
            }
          });
      }

      setStats({ views: currentViews, likes: currentLikes });
    };

    fetchAndMaybeIncrement();
  }, [mounted, slug, isDetail, isPublished]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if inside a card
    if (isLiking) return;

    setIsLiking(true);

    // Atomic increment
    await supabase.rpc("increment_likes", { blog_slug: slug });

    // Optimistic update
    setStats((prev) =>
      prev ? { ...prev, likes: prev.likes + 1 } : { views: 0, likes: 1 }
    );

    setIsLiking(false);
  };

  // Render skeleton during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center text-muted-foreground gap-2",
          viewOnly && "pointer-events-none"
        )}
      >
        <EyeIcon width={16} height={16} className="animate-pulse" />
        <span className="min-w-[20px] animate-pulse">-</span>
        {!viewOnly && (
          <>
            <HeartIcon width={16} height={16} className="animate-pulse" />
            <span className="min-w-[20px] animate-pulse">-</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center text-muted-foreground gap-2",
        viewOnly && "pointer-events-none"
      )}
    >
      <EyeIcon
        width={16}
        height={16}
        className={cn(stats === null && "animate-pulse")}
      />
      <span className={cn("min-w-[20px]", stats === null && "animate-pulse")}>
        {stats?.views ?? "-"}
      </span>
      {!viewOnly && (
        <>
          <HeartIcon
            width={16}
            height={16}
            className={cn(
              "hover:text-red-500 transition-colors",
              isLiking && "animate-pulse text-red-500",
              stats === null && "animate-pulse"
            )}
            onClick={handleLike}
          />
          <span
            className={cn("min-w-[20px]", stats === null && "animate-pulse")}
          >
            {stats?.likes ?? "-"}
          </span>
        </>
      )}
    </div>
  );
};

export default Views;
