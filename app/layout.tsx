import { FocusModeProvider } from "@/components/contexts/focus-mode-context";
import { ThemeProvider } from "@/components/contexts/theme-provider";
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
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
        />
      </head>
      <body
        className={`${newsreader.variable} ${inter.variable} font-sans antialiased text-base`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FocusModeProvider>
            <TooltipProvider delayDuration={0}>
              <KeyboardNav />
              {children}
              <Toaster richColors closeButton position="top-right" />
            </TooltipProvider>
          </FocusModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
