import Image from "next/image";
import LatestPosts from "./_components/latest-posts";

const HomePage = () => {
  return (
    <>
      <div className="flex flex-col items-center justify-center text-center gap-y-4 flex-1 px-6 pb-10 mt-4">
        <Image
          src="/avatar.png"
          width={200}
          height={200}
          alt="avatar"
          className="rounded-full"
        />
        <div className="text-center">
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            welcome to @ttqteo world
          </code>
          <p className="text-xl text-muted-foreground">
            write blogs to share experiences
          </p>
        </div>
      </div>
      <div className="container max-w-[768px] mx-auto px-4">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mb-4">
          Recent posts
        </h4>
        <LatestPosts />
      </div>
    </>
  );
};

export default HomePage;
