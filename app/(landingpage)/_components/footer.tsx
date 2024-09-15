import { appConfig } from "@/lib/config";
import { Logo } from "./logo";

export const Footer = () => {
  return (
    <div className="flex items-center justify-between w-full p-6 bg-background z-50">
      <Logo />
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        {appConfig.version}
      </code>
    </div>
  );
};
