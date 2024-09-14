import { Button } from "@/components/ui/button";
import { GithubIcon, LinkedinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const AboutPage = () => {
  return (
    <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-4 flex-1 px-6 pb-10">
      <Image
        src="/avatar.png"
        width={200}
        height={200}
        alt="avatar"
        className="rounded-full"
      />
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        hello world
      </code>
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        xin chào thế giới
      </code>
      <div className="flex gap-2 items-center">
        <Link href={"https://www.linkedin.com/in/ttqteo/"}>
          <Button variant={"ghost"} className="rounded-full">
            <LinkedinIcon className="w-4 h-4" />
          </Button>
        </Link>
        <Link href={"https://github.com/ttqteo"}>
          <Button variant={"ghost"} className="rounded-full">
            <GithubIcon className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
