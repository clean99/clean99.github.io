export const YOUTUBE_ID = /^[\w-]{11}$/;

export function isYoutubeId(value: unknown): value is string {
  return typeof value === "string" && YOUTUBE_ID.test(value);
}

/** Privacy-enhanced player; it only loads once the reader has asked for the video. */
export function youtubeEmbedUrl(id: string): string {
  if (!isYoutubeId(id)) throw new Error(`Not a YouTube video id: ${id}`);
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
