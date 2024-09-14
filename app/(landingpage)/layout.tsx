import { Navbar } from "./_components/navbar";
import { Footer } from "./_components/footer";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full dark:bg-[#1F1F1F]">
      <Navbar />
      <main className="h-full">
        <div className="min-h-full">
          <div className="mt-[88px]">{children}</div>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default DashboardLayout;
