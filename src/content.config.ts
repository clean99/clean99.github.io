import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Keep the file stem verbatim: legacy URLs are case-sensitive (`/…/React-Performance-Optimization/`). */
const fileStem = ({ entry }: { entry: string }) => entry.replace(/\.(md|mdx)$/, "");

const dateLike = z.union([z.date(), z.string()]);

const tagList = z
  .union([z.array(z.union([z.string(), z.number()])), z.string()])
  .optional()
  .transform((v) => (Array.isArray(v) ? v.map(String) : v));

/** `pnpm new:post --case-study` leaves `role:` and friends blank for the author to fill; blank means unset. */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v?.trim() || undefined);

const caseStudy = z.object({
  role: optionalText,
  period: optionalText,
  team: optionalText,
  stack: z.array(z.string()).default([]),
  impact: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string(), url: z.string() })).default([])
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/posts", generateId: fileStem }),
  schema: z.object({
    title: z.string().min(1),
    date: dateLike,
    updated: dateLike.optional(),
    tags: tagList,
    area: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    featured: z.boolean().optional(),
    audience: z.array(z.string()).optional(),
    lang: z.enum(["en", "zh"]).optional(),
    i18n_key: z.string().optional(),
    permalink: z.string().optional(),
    draft: z.boolean().optional(),
    layout: z.string().optional(),
    case_study: caseStudy.optional()
  })
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/pages", generateId: fileStem }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: dateLike.optional(),
    updated: dateLike.optional(),
    lang: z.enum(["en", "zh"]).optional()
  })
});

export const collections = { posts, pages };
