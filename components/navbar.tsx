import { ModeToggle } from "@/components/theme-toggle";
import { SheetClose } from "@/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";
import Anchor from "./anchor";
import { SheetLeftbar } from "./leftbar";

export const NAVLINKS = [
  { title: "projects", href: "/projects" },
  { title: "blog", href: "/blog" },
  { title: "lab", href: "/lab" },
  { title: "about", href: "/about" },
];

export function Navbar() {
  return (
    // `site-navbar` lets globals.css push it below the admin toolbar; keeping
    // this a static server component is what makes the shell prerenderable.
    <nav className="site-navbar w-full border-b h-14 sticky top-0 z-50 bg-background">
      <div className="sm:container px-2 mx-auto w-[95vw] h-full flex items-center justify-between md:gap-2">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="md:flex hidden items-center gap-4 font-medium text-muted-foreground text-lg">
              <NavMenu />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ModeToggle />
          <SheetLeftbar />
        </div>
      </div>
    </nav>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      {/* logo.png is a full-bleed square; `rounded-full` cropped it into a
          circle and pushed its off-centre glyph against the edge. These two are
          drawn as circles already, so nothing gets clipped. */}
      <Image
        src="/images/logo-dark-circle.png"
        width={32}
        height={32}
        alt="ttqteo"
        className="dark:hidden"
        priority
      />
      <Image
        src="/images/logo-light-circle.png"
        width={32}
        height={32}
        alt=""
        aria-hidden
        className="hidden dark:block"
        priority
      />
      <h2 className="text-lg font-bold hidden sm:block tracking-tight text-foreground">
        ttqteo
      </h2>
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
            activeClassName="!text-primary font-semibold"
            absolute
            className={
              isSheet
                ? "text-3xl font-serif text-foreground hover:text-primary dark:hover:text-orange-300 transition-colors"
                : "flex items-center gap-1 text-sm text-muted-foreground hover:text-primary dark:hover:text-orange-300 transition-colors"
            }
            href={item.href}
          >
            {item.title}
          </Anchor>
        );
        return isSheet ? (
          <SheetClose key={item.title + item.href} asChild>
            {Comp}
          </SheetClose>
        ) : (
          Comp
        );
      })}
    </>
  );
}
