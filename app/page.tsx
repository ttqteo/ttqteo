import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex sm:min-h-[85.5vh] min-h-[85vh] flex-col items-center justify-center text-center px-2 sm:py-8 py-12">
      <h1 className="text-8xl sm:text-6xl font-bold mb-4">
        hi, i{"'"}m{" "}
        <span className="underline-offset-4 underline hover:text-destructive">
          <Link href={"/about"}>@ttqteo</Link>
        </span>
      </h1>
      <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground">
        keep it simple, stupid
      </p>
      <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground">
        --oOo--
      </p>
      <p className="mb-8 sm:text-2xl text-xl max-w-[800px] text-muted-foreground">
        welcome to my world
      </p>
      <div className="flex gap-2 mb-4">
        <Button
          variant={"outline"}
          className="flex items-center gap-2 rounded-full"
        >
          <Link href={"https://ttqcloud.vercel.app/"} target="_blank">
            Hành trình lên mây
          </Link>
          <ExternalLinkIcon className="w-4 h-4" />
        </Button>
        <Button
          variant={"outline"}
          className="flex items-center gap-2 rounded-full"
        >
          <Link href={"https://ttqteo-finance.vercel.app/"} target="_blank">
            Ứng dụng tài chính
          </Link>
          <ExternalLinkIcon className="w-4 h-4" />
        </Button>
        <Button
          variant={"outline"}
          className="flex items-center gap-2 rounded-full"
        >
          <Link href={"https://vnstock-js-docs.vercel.app/"} target="_blank">
            vnstock-js
          </Link>
          <ExternalLinkIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
