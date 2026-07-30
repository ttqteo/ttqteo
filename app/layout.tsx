import { AdminProvider } from "@/components/contexts/admin-context";
import { FocusModeProvider } from "@/components/contexts/focus-mode-context";
import { ThemeProvider } from "@/components/contexts/theme-provider";
import { AdminToolbar } from "@/components/admin-toolbar";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ResumeOrchestrator } from "@/components/resume/resume-orchestrator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardNav } from "@/lib/keyboard-nav";
import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s • ttqteo",
    default: "ttqteo",
  },
  metadataBase: new URL("https://ttqteo.vercel.app/"),
  description:
    "This personal website, named 'ttqteo,' is crafted with Next.js, offering a sleek and responsive design tailored for showcasing your portfolio and tools effectively.",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/images/logo-dark-circle.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/images/logo-light-circle.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var p=localStorage.getItem('reader-prefs');var visible=true;if(p){var o=JSON.parse(p);if(o&&typeof o.tocVisible==='boolean')visible=o.tocVisible;}r.dataset.tocExpanded=visible?'1':'0';}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${newsreader.variable} ${inter.variable} font-sans antialiased text-base`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AdminProvider>
            <FocusModeProvider>
              <TooltipProvider delayDuration={0}>
                <KeyboardNav />
                <ResumeOrchestrator />
                <div className="app-shell min-h-screen flex flex-col">
                  <div className="focus-mode-hidden">
                    <AdminToolbar />
                  </div>
                  <div className="focus-mode-hidden">
                    <Navbar />
                  </div>
                  <main className="sm:container mx-auto w-[90vw] h-auto scroll-smooth flex-1">
                    {children}
                  </main>
                  <div className="site-footer focus-mode-hidden">
                    <Footer />
                  </div>
                </div>
                <Toaster richColors closeButton position="bottom-right" />
              </TooltipProvider>
            </FocusModeProvider>
          </AdminProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
