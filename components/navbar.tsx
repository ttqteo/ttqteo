import { ModeToggle } from "@/components/theme-toggle";
import { SheetClose } from "@/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";
import Anchor from "./anchor";
import { SheetLeftbar } from "./leftbar";
import { isAdmin } from "@/lib/supabase-server";

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
    title: "mindmap",
    href: "/mindmap",
  },
  {
    title: "about",
    href: "/about",
  },
];

export async function Navbar() {
  const admin = await isAdmin();

  return (
    <nav
      className={`w-full border-b h-16 sticky z-50 bg-background ${
        admin ? "top-8" : "top-0"
      }`}
    >
      <div className="sm:container px-2 mx-auto w-[95vw] h-full flex items-center justify-between md:gap-2">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="md:flex hidden items-center gap-4 font-medium text-muted-foreground text-lg">
              <NavMenu />
            </div>
          </div>
        </div>

        <SheetLeftbar />
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
      <h2 className="text-lg font-bold hidden sm:block">ttqteo</h2>
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
            activeClassName="!text-primary dark:font-medium font-bold"
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
