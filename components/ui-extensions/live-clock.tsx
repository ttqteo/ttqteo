"use client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const LiveClock = () => {
  const [dateState, setDateState] = useState(new Date());

  useEffect(() => {
    setInterval(() => setDateState(new Date()), 1000);
  }, []);

  return (
    <div className="fixed left-0 bottom-0 z-99999 m-4">
      <Button variant={"outline"} className="rounded-full">
        {dateState.toLocaleString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })}
      </Button>
    </div>
  );
};

export default LiveClock;
