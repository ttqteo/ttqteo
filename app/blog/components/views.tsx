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
}: {
  slug: string;
  isDetail?: boolean;
  isPublished?: boolean;
}) => {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const hasViewedRef = useRef(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("views, likes")
        .eq("slug", slug)
        .maybeSingle();

      if (data) {
        setStats({ views: data.views, likes: data.likes });
      } else {
        // If no data found, assume 0/0 (or it will create on increment)
        setStats({ views: 0, likes: 0 });
      }
    };

    fetchStats();
  }, [slug]);

  useEffect(() => {
    if (!hasViewedRef.current && isDetail && isPublished) {
      const incrementView = async () => {
        await supabase.rpc("increment_views", { blog_slug: slug });
        // Optimistic update or refetch? Let's just refetch to be accurate
        const { data } = await supabase
          .from("blogs")
          .select("views, likes")
          .eq("slug", slug)
          .maybeSingle();
        if (data) setStats(data);
      };

      incrementView();
      hasViewedRef.current = true;
    }
  }, [slug, isDetail, isPublished]);

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

  return (
    <div className="flex items-center justify-center text-muted-foreground gap-2">
      <EyeIcon
        width={16}
        height={16}
        className={cn(stats === null && "animate-pulse")}
      />
      <span className={cn("min-w-[20px]", stats === null && "animate-pulse")}>
        {stats?.views ?? "-"}
      </span>
      <HeartIcon
        width={16}
        height={16}
        className={cn(
          "cursor-pointer hover:text-red-500 transition-colors",
          isLiking && "animate-pulse text-red-500",
          stats === null && "animate-pulse"
        )}
        onClick={handleLike}
      />
      <span className={cn("min-w-[20px]", stats === null && "animate-pulse")}>
        {stats?.likes ?? "-"}
      </span>
    </div>
  );
};

export default Views;
