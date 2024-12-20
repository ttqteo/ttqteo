import { siteMetadata } from "@/components/metadata";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineIcon,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/components/ui-extensions/timeline";

export const metadata = {
  title: siteMetadata("roadmap"),
};

const data = [
  {
    date: "Sep, 2024",
    title: "v0.1.0",
    description: "Initial Website.",
    feature: [],
    active: true,
  },
  {
    date: "Nov, 2024",
    title: "v0.1.1",
    description: "Minor change homepage UI.",
    feature: [],
    active: false,
  },
  {
    date: "Jan, 2025",
    title: "v0.2.0",
    description: "New feature",
    feature: ["Finance"],
    active: false,
  },
];

const RoadmapPage = () => {
  return (
    <>
      <div className="flex flex-col items-center justify-center md:justify-start text-center gap-y-4 flex-1 px-6 pb-10">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-5xl">
          Roadmap
        </h1>
        <Timeline>
          {data.reverse().map((item) => (
            <TimelineItem key={item.date}>
              <TimelineConnector />
              <TimelineHeader>
                <TimelineTime>{item.date}</TimelineTime>
                <TimelineIcon active={item.active} />
                <TimelineTitle>{item.title}</TimelineTitle>
              </TimelineHeader>
              <TimelineContent>
                <TimelineDescription>
                  <span>{item.description}</span>
                  <ul className="ml-6 list-disc [&>li]:mt-2">
                    {item?.feature.map((feat) => <li key={feat}>{feat}</li>)}
                  </ul>
                </TimelineDescription>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </div>
    </>
  );
};

export default RoadmapPage;
