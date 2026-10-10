import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { siteConfig } from "@/config/site";
import { Providers } from "@/providers";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6FAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1410" },
  ],
};

// Applies the saved accent before first paint so there's no colour flash.
const accentScript = `try{var a=JSON.parse(localStorage.getItem("cms-ui")||"{}").accent;if(a==="blue"||a==="red")document.documentElement.dataset.accent=a}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${lexend.variable} ${sourceSans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
