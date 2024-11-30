"use client";

import { useScrollTop } from "@/hooks/use-scroll-top";
import { cn } from "@/lib/utils";
import { useConvexAuth } from "convex/react";

import { Navbar } from "./navbar";
import NavbarMobile from "./navbar-mobile";

export const Header = () => {
  const scrolled = useScrollTop();

  return (
    <div
      className={cn(
        "z-50 bg-background fixed top-0 flex items-center justify-between gap-4 p-6 w-full",
        scrolled && "border-b shadow-sm"
      )}
    >
      <NavbarMobile />
      <Navbar />
    </div>
  );
};
