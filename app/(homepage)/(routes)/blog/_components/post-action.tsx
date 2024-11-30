import { Button } from "@/components/ui/button";
import { HeartIcon, MessageCircleIcon, Share2Icon } from "lucide-react";

const PostAction = () => {
  return (
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
  );
};

export default PostAction;
