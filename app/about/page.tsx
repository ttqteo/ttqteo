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
    <div className="w-full mx-auto flex flex-col gap-1 sm:min-h-[91vh] min-h-[88vh] pt-2">
      <div className="mb-7 flex flex-col items-center gap-2">
        <Image
          src="/images/avatar.png"
          width={200}
          height={200}
          alt="avatar"
          className="rounded-full"
        />
        <h1 className="text-7xl font-semibold pt-4 pb-6">Hello World</h1>
        <p className="text-muted-foreground text-2xl">
          Xin gửi lời chào đến các bạn.
        </p>
        <p className="text-muted-foreground text-2xl">
          Tôi là anh lập trình viên luôn tìm cái mới thoát khỏi khuôn viên, và
          đó là điều hiển nhiên.
        </p>
        <p className="text-muted-foreground text-2xl">
          {'"'}Tại sao số 10 lại là dấu X vào thời kỳ La Mã, hay điểm IELTS chỉ
          dừng ở 9 là tối đa{'"'}
        </p>
        <div className="flex gap-2">
          <Button
            variant={"outline"}
            className="flex items-center gap-2 rounded-full"
          >
            <Link href={"https://ttqcloud.vercel.app/"} target="_blank">
              Hành trình lên mây
            </Link>
            <ExternalLinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={"outline"}
            className="flex items-center gap-2 rounded-full"
          >
            <Link href={"https://ttqteo-finance.vercel.app/"} target="_blank">
              Ứng dụng tài chính
            </Link>
            <ExternalLinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={"outline"}
            className="flex items-center gap-2 rounded-full"
          >
            <Link href={"https://vnstock-js-docs.vercel.app/"} target="_blank">
              vnstock-js
            </Link>
            <ExternalLinkIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
