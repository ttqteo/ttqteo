import Posts from "./_components/posts";

const HomePage = () => {
  return (
    <div className="flex flex-col gap-4 items-center mx-6">
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        thú vị thì đọc tiếp
      </code>
      <Posts />
    </div>
  );
};

export default HomePage;
