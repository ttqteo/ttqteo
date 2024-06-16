"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/clerk-react";
import { PlusCircleIcon } from "lucide-react";

const AdminPage = () => {
  const { user } = useUser();
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <h2 className="text-lg font-medium">Welcome to {user?.firstName}</h2>
      <Button>
        <PlusCircleIcon className="w-4 h-4 mr-2" />
        Create a note
      </Button>
    </div>
  );
};

export default AdminPage;
