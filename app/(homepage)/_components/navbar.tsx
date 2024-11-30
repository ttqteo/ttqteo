"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Logo } from "./logo";

import { Spinner } from "@/components/ui-extensions/spinner";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";

interface Components {
  title: string;
  href: string;
  description: string;
}

export const navbarComponents: {
  title: string;
  href: string;
  description: string;
  features?: Components[];
}[] = [
  {
    title: "blog",
    href: "/blog",
    description: "",
  },
  {
    title: "news",
    href: "/news",
    description: "",
  },
  {
    title: "tools",
    href: "/tools/markmap",
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
  const path = usePathname();

  return (
    <>
      <div className="md:flex hidden items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Logo />
            </NavigationMenuItem>
            {navbarComponents.map((component) =>
              !component?.features ? (
                <NavigationMenuItem key={component.href}>
                  <Link href={component.href} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(navigationMenuTriggerStyle())}
                    >
                      <Button
                        variant={"link"}
                        className={cn(
                          "p-0",
                          path.match(component.title)
                            ? "font-bold"
                            : "font-normal text-gray-500"
                        )}
                      >
                        {component.title}
                      </Button>
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={component.href}>
                  <NavigationMenuTrigger
                    className={cn(navigationMenuTriggerStyle())}
                  >
                    <Button
                      variant={"link"}
                      className={cn(
                        "p-0",
                        path.match(component.title)
                          ? "font-bold"
                          : "font-normal text-gray-500"
                      )}
                    >
                      {component.title}
                    </Button>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="absolute">
                    <ul className="w-[400px] p-4 ">
                      {component.features?.map((feature: Components) => (
                        <ListItem
                          key={feature.title}
                          title={feature.title}
                          href={feature.href}
                        >
                          {feature.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="justify-end w-full flex items-center">
        {isLoading && <Spinner size={"small"} className="mr-2" />}
        {!isAuthenticated && !isLoading && (
          <>
            <Link href={"https://github.com/ttqteo/ttqteo"} target="_blank">
              <Button
                variant={"link"}
                className="rounded-full flex gap-2 items-center"
              >
                github
                <ExternalLinkIcon className="h-[1.2rem] w-[1.2rem]" />
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
      </div>
    </>
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
