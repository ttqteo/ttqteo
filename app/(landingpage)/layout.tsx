import { Navbar } from "./_components/navbar";
import { Footer } from "./_components/footer";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full">
      <Navbar />
      <main className="h-full">
        <div className="min-h-full">
          <div className="mt-24 container mx-auto">{children}</div>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default DashboardLayout;
