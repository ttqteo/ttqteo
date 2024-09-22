"use client";
import { appConfig } from "@/lib/config";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import Link from "next/link";

const Footer = () => {
  const [dateState, setDateState] = useState(new Date());

  useEffect(() => {
    setInterval(() => setDateState(new Date()), 1000);
  }, []);

  return (
    <div className="fixed left-0 right-0 bottom-0 z-99999 m-4 flex justify-between items-center">
      <Button
        variant={"outline"}
        className="rounded-full flex gap-2 items-center"
      >
        {dateState.toLocaleString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })}
      </Button>
      <Button
        variant={"ghost"}
        className="rounded-full flex gap-2 items-center"
      >
        <Link href={"/roadmap"}>
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {appConfig.version}
          </code>
        </Link>
      </Button>
    </div>
  );
};

// old
// return (
//   <div className="flex items-center justify-between w-full p-6 bg-background z-50">
//     <Logo />
//     <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
//       {appConfig.version}
//     </code>
//   </div>
// );

export default Footer;
