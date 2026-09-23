import { isYoutubeId, youtubeEmbedUrl } from "../lib/video";

// One delegated listener: facades can appear anywhere in post bodies.
document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  const facade = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.video-facade[data-youtube]");
  const id = facade?.dataset.youtube;
  if (!facade || !isYoutubeId(id)) return;
  event.preventDefault();

  const iframe = document.createElement("iframe");
  iframe.src = youtubeEmbedUrl(id);
  iframe.title = facade.textContent?.trim() || "YouTube video";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  facade.replaceWith(iframe);
  iframe.focus();
});
