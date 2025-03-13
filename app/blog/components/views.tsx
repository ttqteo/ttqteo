"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { EyeIcon, HeartIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const Views = ({
  slug,
  isDetail = false,
  isPublished = false,
}: {
  slug: string;
  isDetail?: boolean;
  isPublished?: boolean;
}) => {
  const blogDetails = useQuery(api.blogs.getBySlug, { slug });
  const updateViews = useMutation(api.blogs.incrementViews);
  const updateLikes = useMutation(api.blogs.incrementLikes);
  const hasViewedRef = useRef(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (!hasViewedRef.current && isDetail && isPublished) {
      updateViews({ slug });
      hasViewedRef.current = true;
    }
  }, []);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    await updateLikes({ slug });
    setIsLiking(false);
  };

  return (
    <div className="flex items-center justify-center text-muted-foreground gap-2">
      <EyeIcon
        width={16}
        height={16}
        className={cn(blogDetails === undefined && "animate-pulse")}
      />
      <span
        className={cn(
          "min-w-[20px]",
          blogDetails === undefined && "animate-pulse"
        )}
      >
        {blogDetails?.views ?? "-"}
      </span>
      <HeartIcon
        width={16}
        height={16}
        className={cn(
          "cursor-pointer hover:text-red-500 transition-colors",
          isLiking && "animate-pulse text-red-500",
          blogDetails === undefined && "animate-pulse"
        )}
        onClick={handleLike}
      />
      <span
        className={cn(
          "min-w-[20px]",
          blogDetails === undefined && "animate-pulse"
        )}
      >
        {blogDetails?.likes ?? "-"}
      </span>
    </div>
  );
};

export default Views;
