import type { Metadata } from "next";
import { LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://clean99.github.io"),
  title: {
    default: "Koh Hom",
    template: "%s · Koh Hom"
  },
  description: "Software, AI, frontend systems, learning, and clear thinking.",
  icons: {
    icon: "/favicon.png"
  },
  openGraph: {
    images: ["/thumbnail.jpg"],
    siteName: "Koh Hom",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LiquidProvider defaultMode="auto" maxEnhancedSurfaces={10}>
          {children}
        </LiquidProvider>
      </body>
    </html>
  );
}
