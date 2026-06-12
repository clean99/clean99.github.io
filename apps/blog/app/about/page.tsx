import type { Metadata } from "next";
import { AboutContent } from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description: "About Koh Hom and this long-running field notebook.",
  alternates: {
    canonical: "/about/"
  }
};

export default async function AboutPage() {
  return <AboutContent />;
}
