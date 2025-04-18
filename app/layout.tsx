import { ThemeProvider } from "@/components/contexts/theme-provider";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/contexts/convex-provider";

const eb_garamond = EB_Garamond({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
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
        url: "/images/logo.png",
        href: "/images/logo.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/images/logo.png",
        href: "/images/logo.png",
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
        className={`${eb_garamond.className} font-regular antialiased tracking-wide text-base`}
        suppressHydrationWarning
      >
        <ConvexClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            <main className="sm:container mx-auto w-[90vw] h-auto scroll-smooth">
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
