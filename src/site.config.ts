export const SITE_URL = "https://clean99.github.io";

export const AUTHOR = {
  name: "Koh Hom",
  nativeName: "许峰",
  alternateName: "Xu Feng",
  email: "xff9924@gmail.com",
  github: "https://github.com/clean99",
  githubHandle: "clean99",
  jobTitle: "Software Engineer",
  knowsAbout: [
    "Frontend architecture",
    "Web performance",
    "React",
    "Software testing",
    "AI agents",
    "AI-assisted software engineering"
  ],
  worksFor: ["Shopee", "Ant Group", "ByteDance", "TikTok"]
} as const;

export const SITE = {
  title: "Koh Hom — Engineer's Field Notes",
  shortTitle: "Koh Hom",
  timezoneOffset: "+08:00",
  defaultLang: "en",
  langs: ["en", "zh"],
  repo: "clean99/clean99.github.io",
  branch: "dev",
  postsDir: "content/posts",
  imagesDir: "content/img"
} as const;
