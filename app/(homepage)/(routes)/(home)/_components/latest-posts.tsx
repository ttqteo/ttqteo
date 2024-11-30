"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { CalendarIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import Moment from "react-moment";

const LatestPosts = () => {
  const documents = useQuery(api.documents.getFiveLatestPublic);

  if (documents == null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-[50%]" />
        <Skeleton className="h-8 w-[50%]" />
        <Skeleton className="h-8 w-[50%]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {documents.map((document) => (
        <Card className="border-0 rounded-md shadow-none" key={document._id}>
          <CardContent>
            <Link href={`/blog/${document._id}`}>
              <Button variant={"link"} className="text-left p-0">
                <CardTitle className="flex gap-2 items-center">
                  <ChevronRightIcon />
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
            {/* <CardDescription>description</CardDescription> */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LatestPosts;
