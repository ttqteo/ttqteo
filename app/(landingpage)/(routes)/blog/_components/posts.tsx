"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import Moment from "react-moment";

const Posts = () => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

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
    <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 w-full">
      {documents.map((document) => (
        <Link href={`/blog/${document._id}`} key={document._id}>
          <Card className="border-0 rounded-md shadow-none hover:shadow-md dark:hover:shadow-gray-800 transition-all overflow-hidden">
            {!!document.coverImage && (
              <div className="w-full h-[200px] relative group">
                <Image
                  src={document.coverImage}
                  fill
                  alt="Cover"
                  className="object-cover"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle>{document.title}</CardTitle>
              <CardDescription>this is description</CardDescription>
            </CardHeader>
            <CardFooter
              onClick={(e) => e.preventDefault()}
              className="flex justify-between"
            >
              <p className="text-sm text-muted-foreground">
                <Moment format="DD MMM yyyy">{document._creationTime}</Moment>
              </p>
              <div className="flex gap-2 pl-0">
                <Button variant={"ghost"} size={"sm"} className="rounded-full">
                  <HeartIcon className="w-4 h-4" />
                </Button>
                <Button variant={"ghost"} size={"sm"} className="rounded-full">
                  <MessageCircleIcon className="w-4 h-4" />
                </Button>
                <Button variant={"ghost"} size={"sm"} className="rounded-full">
                  <Share2Icon className="w-4 h-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default Posts;
