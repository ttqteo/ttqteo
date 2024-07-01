import React from "react";
import { Heading } from "./_components/heading";
import { Footer } from "./_components/footer";

const HomePage = () => {
  return (
    <div className="min-h-full flex flex-col">
      <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-8 flex-1 px-6 pb-10">
        <Heading />
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;
