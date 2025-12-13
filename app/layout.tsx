import { ThemeProvider } from "@/components/contexts/theme-provider";
import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";

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
        url: "/images/logo-dark-circle.png",
        href: "/images/logo-dark-circle.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/images/logo-light-circle.png",
        href: "/images/logo-light-circle.png",
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
        className={`${eb_garamond.className} antialiased tracking-wide text-base`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
