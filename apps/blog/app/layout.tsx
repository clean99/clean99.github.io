import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koh Hom",
  description: "Software, AI, systems, and the practice of living well."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
