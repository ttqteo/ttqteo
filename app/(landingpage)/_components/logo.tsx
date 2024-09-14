import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const Logo = () => {
  return (
    <Link href={"/"} className="w-full">
      <div className="flex items-center gap-x-2">
        <Image src="/logo.png" height={32} width={32} alt="logo" />
        <span className={cn("font-semibold", font.className)}>ttqteo</span>
      </div>
    </Link>
  );
};
