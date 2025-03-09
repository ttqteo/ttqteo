import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Author, BlogMdxFrontmatter, getAllBlogs } from "@/lib/markdown";
import { formatDate2, stringToDate } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "about me",
};

export default async function AboutPage() {
  return (
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[78vh] min-h-[76vh] pt-2">
      <div className="mb-7 flex flex-col items-start sm:items-center gap-2">
        <Image
          src="/images/avatar.png"
          width={200}
          height={200}
          alt="avatar"
          className="rounded-full"
        />
        <h1 className="text-6xl sm:text-7xl font-semibold pt-4 pb-6">
          Hello World
        </h1>
        <p className="text-muted-foreground text-2xl">
          Xin gửi lời chào đến các bạn.
        </p>
        <p className="text-muted-foreground text-2xl text-start sm:text-center">
          Tôi là anh lập trình viên luôn tìm cái mới thoát khỏi khuôn viên,{" "}
          <br /> và đó là điều hiển nhiên.
        </p>
        <blockquote className="text-muted-foreground mt-6 border-l-2 pl-6 text-2xl italic  text-start sm:text-center">
          {'"'}Tại sao số 10 lại là dấu X vào thời kỳ La Mã <br /> hay điểm
          IELTS chỉ dừng ở 9 là tối đa?{'"'}
        </blockquote>
      </div>
    </div>
  );
}
