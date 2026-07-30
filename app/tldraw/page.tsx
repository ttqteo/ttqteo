"use client";

import "tldraw/tldraw.css";
import dynamic from "next/dynamic";

const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
});

export default function AboutPage() {
  return (
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <Tldraw persistenceKey="example" className="w-[1000px] h-[600px]" />
    </div>
  );
}
