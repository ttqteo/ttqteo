import { Suspense } from "react";
import { Header } from "./_components/header";
import { Spinner } from "@/components/ui-extensions/spinner";
import Footer from "./_components/footer";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Header />
      <main>
        <div className="mt-24 container mx-auto">
          <Suspense fallback={<Spinner />}>{children}</Suspense>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default DashboardLayout;
