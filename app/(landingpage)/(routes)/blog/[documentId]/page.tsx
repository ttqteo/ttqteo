"use client";

import { Cover } from "@/components/cover";
import Metadata, { siteMetadata } from "@/components/metadata";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { appConfig } from "@/lib/config";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeftIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Moment from "react-moment";

interface DocumentIdPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );
  const document = useQuery(api.documents.getById, {
    documentId: params.documentId,
  });

  const update = useMutation(api.documents.update);

  const onChange = (content: string) => {
    update({
      id: params.documentId,
      content,
    });
  };

  const router = useRouter();

  if (document === undefined) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
          <div className="space-y-4 pl-8 pt-4">
            <Skeleton className="h-14 w-[50]%" />
            <Skeleton className="h-4 w-[80]%" />
            <Skeleton className="h-4 w-[40]%" />
            <Skeleton className="h-14 w-[60]%" />
          </div>
        </div>
      </div>
    );
  }

  if (document === null) {
    return <div>Not found</div>;
  }

  return (
    <>
      <Metadata title={siteMetadata(document.title)} />
      <div className="pb-40">
        <div>
          <Button variant={"link"} onClick={router.back}>
            <ArrowLeftIcon className="w-4 h-4" />
            home
          </Button>
        </div>
        <Cover url={document.coverImage} preview />
        <div className="md:max-w-3xl lg:md-max-w-4xl mx-auto">
          <Toolbar initialData={document} preview />
          <p className="pl-[54px] text-sm text-muted-foreground">
            <Moment format="DD MMM yyyy">{document._creationTime}</Moment>
          </p>
          <Editor
            onChange={onChange}
            initialContent={document.content}
            editable={false}
          />
        </div>
      </div>
    </>
  );
};

export default DocumentIdPage;
