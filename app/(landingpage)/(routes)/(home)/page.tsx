import Image from "next/image";

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-4 flex-1 px-6 pb-10 mt-4">
      <Image
        src="/avatar.png"
        width={200}
        height={200}
        alt="avatar"
        className="rounded-full"
      />
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        welcome to @ttqteo world
      </code>
    </div>
  );
};

export default HomePage;
