import { activeHeading, type HeadingPosition } from "../lib/toc";

/** Fraction of the viewport height where a section counts as "being read". */
const READING_LINE = 0.3;

const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]')];
const ids = [...new Set(links.map((link) => decodeURIComponent(link.hash.slice(1))))];
const headings = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
const rail = document.querySelector<HTMLElement>(".toc-rail");

let current: string | undefined;
let queued = false;

function keepInView(link: HTMLAnchorElement) {
  if (!rail || !rail.contains(link) || rail.scrollHeight <= rail.clientHeight) return;
  const top = link.offsetTop - rail.offsetTop;
  if (top < rail.scrollTop || top + link.offsetHeight > rail.scrollTop + rail.clientHeight) {
    rail.scrollTop = top - rail.clientHeight / 3;
  }
}

function update() {
  queued = false;
  const positions: HeadingPosition[] = headings.map((el) => ({ id: el.id, top: el.getBoundingClientRect().top }));
  const next = activeHeading(positions, innerHeight * READING_LINE);
  if (next === current) return;
  current = next;
  for (const link of links) {
    const on = next !== undefined && decodeURIComponent(link.hash.slice(1)) === next;
    if (on) {
      link.setAttribute("aria-current", "true");
      keepInView(link);
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

if (headings.length > 0) {
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  update();
}
