"use client";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useScrollTop } from "@/hooks/use-scroll-top";
import { cn } from "@/lib/utils";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Logo } from "./logo";

import { Spinner } from "@/components/ui-extensions/spinner";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { GithubIcon, LogInIcon } from "lucide-react";
import React from "react";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "home",
    href: "/",
    description: "",
  },
  {
    title: "blog",
    href: "/blog",
    description: "",
  },
  {
    title: "roadmap",
    href: "/roadmap",
    description: "",
  },
  {
    title: "about",
    href: "/about",
    description: "",
  },
];

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const scrolled = useScrollTop();

  return (
    <div
      className={cn(
        "z-50 bg-background fixed top-0 flex items-center justify-between gap-4 p-6 w-full",
        scrolled && "border-b shadow-sm"
      )}
    >
      <div className="flex items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href={"/"} legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:bg-none!important"
                  )}
                >
                  <Logo />
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            {components.map((component) => (
              <NavigationMenuItem key={component.href}>
                <Link href={component.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(navigationMenuTriggerStyle(), "rounded-full")}
                  >
                    {component.title}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="justify-end w-full flex items-center">
        {isLoading && <Spinner size={"small"} />}
        {!isAuthenticated && !isLoading && (
          <>
            <SignInButton mode="modal">
              <Button variant={"ghost"} className="rounded-full mr-2">
                log in
              </Button>
            </SignInButton>
            <Link href={"https://github.com/ttqteo/ttqteo"} target="_blank">
              <Button
                variant={"outline"}
                size="icon"
                className="rounded-full mr-2"
              >
                <GithubIcon className="h-[1.2rem] w-[1.2rem] rounded-full" />
              </Button>
            </Link>
          </>
        )}
        {isAuthenticated && !isLoading && (
          <div className="flex gap-2 items-center mr-2">
            <Button variant={"ghost"} size={"sm"} className="rounded-full">
              <Link href={"/admin"}>go to dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
        <ModeToggle />
      </div>
    </div>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
