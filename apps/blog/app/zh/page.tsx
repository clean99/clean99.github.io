import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PostList } from "@/components/PostList";
import { getPostsByLanguage } from "@/lib/posts";

export const metadata: Metadata = {
  title: "中文",
  description: "中文技术文章与长期笔记。"
};

export default function ZhPage() {
  return (
    <PageShell>
      <section className="page-heading">
        <p className="eyebrow">中文</p>
        <h1>许峰 / Koh Hom</h1>
        <p>我构建可靠的前端系统与 AI 辅助工作流。</p>
      </section>
      <PostList posts={getPostsByLanguage("zh")} />
    </PageShell>
  );
}
