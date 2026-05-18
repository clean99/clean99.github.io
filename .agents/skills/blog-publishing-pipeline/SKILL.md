---
name: blog-publishing-pipeline
description: Create, optimize, review, and publish bilingual Hexo blog posts in this repository. Use when the user asks to write a blog post, process raw article notes, convert source material into a reader-facing article, optimize an existing post, create Chinese/English paired posts, add images, or publish a post to the Hexo blog.
---

# Blog Publishing Pipeline

Use this skill for blog work in this Hexo repository. The goal is to turn source material into publishable posts with the least ceremony and the most useful reader value.

## Repository Contract

- Work on `dev`; never publish directly to `master`.
- Posts live in `source/_posts/`.
- Images live in `source/img/<topic-slug>/` and are referenced as `/img/<topic-slug>/<file>`.
- English and Chinese versions share the same `date`, `tags`, and `i18n_key`.
- Chinese posts must include an explicit `permalink`; Hexo does not add the `zh/` prefix automatically.
- After content changes, run the available build/check command. This repo has no dedicated lint or unit-test script; use `npm run build` as the publishing gate unless scripts are added later.
- Commit only the files changed for the article and related assets.

## Frontmatter

English:

```yaml
---
title: Full English Title
date: YYYY-MM-DD HH:mm:ss
tags: [AI, Software Engineering, Web Performance]
lang: en
i18n_key: Full-English-Title
---
```

Chinese:

```yaml
---
title: 中文标题
date: YYYY-MM-DD HH:mm:ss
tags: [AI, Software Engineering, Web Performance]
lang: zh
i18n_key: Full-English-Title
permalink: zh/YYYY/MM/DD/Full-English-Title/
---
```

## Article Workflow

1. Gather source material:
   - Read the user prompt and any linked local files.
   - Fetch linked Feishu/Lark/Notion docs when accessible.
   - If an internal doc cannot be fetched, use only the material already present and state the gap.
2. Decide the article shape:
   - Core topic in one sentence.
   - Target audience.
   - Article type: case study, tutorial, technical deep dive, notes, or opinion.
   - Reader takeaway: what the reader can reuse after reading.
3. Filter content:
   - Keep design choices, evidence, tradeoffs, and reusable patterns.
   - Remove operational noise, raw logs, secret/internal identifiers, and details that do not help the reader.
   - For internal work, generalize sensitive project names unless the user explicitly wants them public.
   - Do not narrate sanitization, redaction, or "what was removed" unless the article is specifically about that process.
   - Convert source-material provenance into reader-facing substance: mechanism, evidence, failure modes, and reusable steps.
   - Avoid titles and first-screen copy that say "public version", "sanitized", or "internal version"; readers care about the problem and the takeaway.
4. Write the source-language post first:
   - Start with a 2-4 sentence `TL;DR`.
   - Use a clear intro, technical body, and conclusion.
   - Prefer concrete tables and diagrams over long narrative.
   - Explain terms naturally when they matter, without turning the post into a glossary.
5. Create the second language version:
   - Translate naturally, not word-for-word.
   - Keep headings, image references, tables, and code blocks aligned.
   - Keep technical terms consistent across both versions.
6. Add visuals:
   - Use Mermaid for architecture/flow diagrams when static diagrams are enough.
   - Use image files only when the post benefits from real visual evidence or generated illustrations.
   - For articles based on internal or domain-specific products, add an early audience-orientation visual before deep architecture, metrics, or implementation sections.
   - That visual should answer what the product or workflow looks like, who uses it, what action the user takes, where the technical mechanism appears, and why the later metrics matter.
   - Prefer generic product mockups or scenario diagrams over internal screenshots; avoid internal names, URLs, secrets, and operational identifiers.
   - Verify referenced image files exist.
7. Review before publishing:
   - No WIP/TODO/FIXME/placeholders.
   - Valid YAML frontmatter.
   - No broken markdown tables or code fences.
   - No private tokens, cookies, raw log IDs, or unrelated internal details.
   - The first viewport should explain the reader value, not the drafting or cleanup process.
   - If the article depends on business context unfamiliar to public readers, the first viewport includes a product or scenario visual, not only architecture or metric diagrams.
   - If adapting a skill/workflow, the article should teach the workflow's control loop and proof rules before showing long code blocks.
   - `npm run build` succeeds.
8. Commit:
   - Stage only the article files, related image assets, and intentional skill/docs changes.
   - Use `post: <brief topic>` for new posts.

## Useful Tags

Prefer existing tags where they fit:

- `AI`
- `Software Engineering`
- `Web Performance`
- `Frontend`
- `ChatGPT`
- `code generation`
- `testing`

Add specific tags only when they improve discovery.

## Blog Article Quality Bar

Good posts in this repo are not content dumps. A useful post should answer:

- What was the real problem?
- What data or harness made the problem observable?
- What loop converted observation into changes?
- What failed or almost failed?
- What can readers reuse in their own work?
- What was the result, stated without overclaiming?
- Why should a reader care in the first screen?

When writing about performance optimization, keep the proof discipline strict:

- Tests, builds, and deployments prove shipping health, not performance impact.
- Performance claims need comparable measurements.
- A negative or unmeasured round should be labeled honestly.
- Diagrams must show the mechanism, not decorative boxes.
