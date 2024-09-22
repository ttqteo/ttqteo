import { Suspense } from "react";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { Spinner } from "@/components/ui-extensions/spinner";
import LiveClock from "@/components/ui-extensions/live-clock";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full">
      <Header />
      <main className="h-full">
        <div className="min-h-full">
          <div className="mt-24 container mx-auto">
            <Suspense fallback={<Spinner />}>{children}</Suspense>
          </div>
        </div>
        <LiveClock />
        <Footer />
      </main>
    </div>
  );
};

export default DashboardLayout;
