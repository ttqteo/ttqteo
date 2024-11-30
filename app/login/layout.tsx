import { Suspense } from "react";
import { Spinner } from "@/components/ui-extensions/spinner";

const LoginLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <main>
        <div className="mt-24 container flex justify-center items-center">
          <Suspense fallback={<Spinner />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
};

export default LoginLayout;
