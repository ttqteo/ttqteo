import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";
import Link from "next/link";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const Logo = () => {
  return (
    <Button variant={"link"}>
      <Link href={"/"} className="w-full" legacyBehavior passHref>
        <span className={cn("font-semibold", font.className)}>ttqteo</span>
      </Link>
    </Button>
  );
};
