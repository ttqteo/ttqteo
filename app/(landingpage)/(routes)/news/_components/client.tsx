"use client";

import { Spinner } from "@/components/ui-extensions/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";
import { LayoutListIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Moment from "react-moment";
import { News, NewsResponse } from "../_model/news";

const NewsClient = () => {
  const [newsData, setNewsData] = useState<NewsResponse>();
  useEffect(() => {
    const getData = async () => {
      const resp = await axios.get(`/api/news`);
      setNewsData(resp.data);
    };
    getData();
  }, []);

  if (newsData === undefined) {
    return <Spinner>Fetching data...</Spinner>;
  }

  if (newsData === null) {
    return <div>NOT FOUND</div>;
  }

  return (
    <>
      <div className="flex w-full justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total results: {newsData?.totalResults}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button className="rounded-full" variant={"outline"} size={"icon"}>
              <LayoutListIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"end"}>
            <DropdownMenuItem>Row</DropdownMenuItem>
            <DropdownMenuItem>Grid</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {newsData?.articles.map(
          (news: News, idx: number) =>
            idx < 11 &&
            news.urlToImage && (
              <Link key={news.url} href={news.url} target="_blank">
                <Card className="border-none shadow-none">
                  {!!news.urlToImage && (
                    <div className="w-full h-[200px] relative group">
                      <Image
                        src={news.urlToImage}
                        fill
                        alt="Cover"
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger>
                          <CardTitle className="text-md line-clamp-2">
                            {news.title}
                          </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent side={"bottom"}>
                          <div className="w-[200px] line-clamp-3 font-sm">
                            {news.content}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardHeader>
                  <CardFooter>
                    <div className="w-full flex justify-between items-center text-sm gap-4">
                      <Moment
                        format="DD MMM yyyy"
                        className="whitespace-nowrap"
                      >
                        {news.publishedAt}
                      </Moment>
                      <div className="line-clamp-1">{news.author}</div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            )
        )}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  );
};

export default NewsClient;
