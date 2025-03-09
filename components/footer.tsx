import { EarthIcon, GithubIcon, TriangleIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export function Footer() {
  return (
    <footer className="border-t w-full h-16">
      <div className="container flex items-center sm:justify-between justify-center sm:gap-0 gap-4 h-full text-muted-foreground text-sm flex-wrap sm:py-0 py-3 max-sm:px-4">
        <div className="flex items-center gap-3">
          <p className="text-center">© Copyright {new Date().getFullYear()}</p>
        </div>

        <div className="hidden md:flex">
          <FooterButtons />
        </div>
      </div>
    </footer>
  );
}

export function FooterButtons() {
  return (
    <>
      <Link href="https://github.com/ttqteo/ttqteo">
        <Button variant={"link"}>
          <GithubIcon className="h-[0.8rem] w-4 mr-2 text-primary fill-current" />
          Github
        </Button>
      </Link>
      <Link href="https://ariadocs.vercel.app/">
        <Button variant={"link"}>
          <TriangleIcon className="h-[0.8rem] w-4 mr-2 text-primary fill-current" />
          Build with AriaDocs
        </Button>
      </Link>
    </>
  );
}
