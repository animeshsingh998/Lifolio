import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

// Manrope for reading, Space Grotesk for headings: a free pairing close to the
// geometric grotesque look of the reference brand.
const fontSans = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const fontHeading = Space_Grotesk({ variable: "--font-heading", subsets: ["latin"] });
const fontMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "A personal life dashboard and digital archive.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141211" },
    { media: "(prefers-color-scheme: light)", color: "#fbfaf9" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
