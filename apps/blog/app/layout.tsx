import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
