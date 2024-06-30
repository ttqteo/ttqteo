"use client";

import { Toolbar } from "@/components/toolbar";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface DocumentIdPageProops {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProops) => {
  const document = useQuery(api.documents.getById, {
    documentId: params.documentId,
  });

  if (document === undefined) {
    return <div>Loading...</div>;
  }

  if (document === null) {
    return <div>Not found</div>;
  }

  return (
    <div className="p-40">
      <div className="h-[35vh]">
        <div className="md:max-w-3xl lg:md-max-w-4xl mx-auto">
          <Toolbar initialData={document} />
        </div>
      </div>
    </div>
  );
};

export default DocumentIdPage;
