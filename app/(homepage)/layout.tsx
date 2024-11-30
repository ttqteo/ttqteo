import { Suspense } from "react";
import { Header } from "./_components/header";
import { Spinner } from "@/components/ui-extensions/spinner";
import Tools from "./_components/tools";
import Footer from "./_components/footer";

const HomePageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Header />
      <main>
        <div className="mt-24 container mx-auto">
          <Suspense fallback={<Spinner />}>{children}</Suspense>
          <Footer />
        </div>
        <Tools />
      </main>
    </div>
  );
};

export default HomePageLayout;
