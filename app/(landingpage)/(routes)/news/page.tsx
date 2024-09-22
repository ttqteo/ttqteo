import { siteMetadata } from "@/components/metadata";
import NewsClient from "./_components/client";

export const metadata = {
  title: siteMetadata("news"),
};

const NewsPage = async () => {
  return (
    <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-4 flex-1 px-6 pb-10">
      <NewsClient />
    </div>
  );
};

export default NewsPage;
