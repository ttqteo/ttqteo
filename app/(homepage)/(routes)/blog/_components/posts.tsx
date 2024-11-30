"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import Moment from "react-moment";
import PostAction from "./post-action";
import { CalendarIcon, ChevronRightIcon } from "lucide-react";

const Posts = () => {
  const documents = useQuery(api.documents.getPublic);

  if (documents == null) {
    return (
      <>
        <Skeleton className="h-4 w-[30%]" />
        <Skeleton className="h-4 w-[30%]" />
        <Skeleton className="h-4 w-[30%]" />
      </>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 container max-w-[768px]">
      {documents.map((document) => (
        <Card
          className="border-0 rounded-md shadow-none transition-all overflow-hidden"
          key={document._id}
        >
          <div className="grid grid-cols-2">
            <div className="w-full h-[200px] relative group">
              <Image
                src={
                  !!document.coverImage ? document.coverImage : "/no-image.png"
                }
                fill
                alt="Cover"
                className="object-cover"
              />
            </div>
            <CardContent>
              <Link href={`/blog/${document._id}`}>
                <Button variant={"link"} className="text-left p-0">
                  <CardTitle className="flex gap-2 items-center">
                    {document.title}
                  </CardTitle>
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <Moment format="DD MMM yyyy">
                  {document.updatedAt || document._creationTime}
                </Moment>
              </p>
              {false && <PostAction />}
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Posts;
