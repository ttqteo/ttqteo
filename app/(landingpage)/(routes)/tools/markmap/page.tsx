import { siteMetadata } from "@/components/metadata";
import MarkmapHooks from "./_components/markmap";

export const metadata = {
  title: siteMetadata("markdown"),
};

const MarkmapPage = () => {
  return (
    <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-4 flex-1 px-6 pb-10">
      <MarkmapHooks />
    </div>
  );
};

export default MarkmapPage;
