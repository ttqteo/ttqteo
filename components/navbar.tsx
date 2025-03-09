import { ModeToggle } from "@/components/theme-toggle";
import { SheetClose } from "@/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";
import Anchor from "./anchor";
import { SheetLeftbar } from "./leftbar";

export const NAVLINKS = [
  {
    title: "home",
    href: "/",
  },
  {
    title: "blog",
    href: "/blog",
  },
  {
    title: "about",
    href: "/about",
  },
];

export function Navbar() {
  return (
    <nav className="w-full border-b h-16 sticky top-0 z-50 bg-background">
      <div className="sm:container mx-auto w-[95vw] h-full flex items-center justify-between md:gap-2">
        <div className="flex items-center gap-5">
          <SheetLeftbar />
          <div className="flex items-center gap-6">
            <div className="md:flex hidden">
              <Logo />
            </div>
            <div className="md:flex hidden items-center gap-4 font-medium text-muted-foreground text-lg">
              <NavMenu />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* <Search /> */}
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image
        src="/images/logo.png"
        width={32}
        height={32}
        alt="logo"
        className="rounded-full"
      />
      <h2 className="text-lg font-bold">ttqteo</h2>
    </Link>
  );
}

export function NavMenu({ isSheet = false }) {
  return (
    <>
      {NAVLINKS.map((item) => {
        const Comp = (
          <Anchor
            key={item.title + item.href}
            activeClassName="!text-primary dark:font-medium font-semibold"
            absolute
            className="flex items-center gap-1 dark:text-stone-300/85 text-stone-800 hover:text-destructive dark:hover:text-[#e72020]"
            href={item.href}
          >
            {item.title}
          </Anchor>
        );
        return isSheet ? (
          <SheetClose key={item.title + item.href} asChild className="text-3xl">
            {Comp}
          </SheetClose>
        ) : (
          Comp
        );
      })}
    </>
  );
}
