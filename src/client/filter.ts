import { ALL_AREAS, areaHref, resolveArea } from "../lib/filter";

/**
 * Progressive enhancement for the writing index's area filter.
 *
 * The index renders every note, and each chip is a plain anchor whose URL is the
 * page that shows that area. A reader without JavaScript follows the link and
 * gets exactly that view; with JavaScript the same click is answered from the
 * page already on screen, the URL is updated through the history API, and the
 * result is announced in the live region.
 */

const root = document.querySelector<HTMLElement>("[data-area-filter]");
const ledger = document.querySelector<HTMLElement>("[data-area-groups]");
const status = document.querySelector<HTMLElement>("[data-area-status]");

if (root && ledger && status) {
  const chips = [...root.querySelectorAll<HTMLAnchorElement>("[data-area-chip]")];
  const groups = [...ledger.querySelectorAll<HTMLElement>("[data-area-group]")];
  const path = root.dataset.basePath ?? location.pathname;
  const known = chips.map((chip) => chip.dataset.area ?? ALL_AREAS).filter((area) => area !== ALL_AREAS);
  const template = root.dataset.countTemplate ?? "{shown} / {total}";
  const allTemplate = root.dataset.countAllTemplate ?? "{total}";
  const total = ledger.querySelectorAll("[data-area]").length;
  const jumps = [...document.querySelectorAll<HTMLElement>("[data-year-link]")];

  const caption = (shown: number) =>
    shown === total
      ? allTemplate.replace("{total}", String(total))
      : template.replace("{shown}", String(shown)).replace("{total}", String(total));

  const apply = (area: string, push: boolean) => {
    let shown = 0;
    for (const group of groups) {
      let inGroup = 0;
      for (const row of group.querySelectorAll<HTMLElement>("[data-area]")) {
        const match = area === ALL_AREAS || row.dataset.area === area;
        row.hidden = !match;
        if (match) inGroup += 1;
      }
      // A year with nothing left loses its heading, its count and its jump link.
      group.hidden = inGroup === 0;
      const cell = group.querySelector<HTMLElement>("[data-year-count]");
      if (cell) {
        // A count of one needs its own string, not a plural with the number swapped.
        const shape =
          inGroup === 1 ? (cell.dataset.countTemplateOne ?? cell.dataset.countTemplate) : cell.dataset.countTemplate;
        if (shape) cell.textContent = shape.replace("{n}", String(inGroup));
      }
      const jump = jumps.find((item) => item.dataset.yearLink === String(group.dataset.year));
      if (jump) {
        jump.hidden = inGroup === 0;
        const badge = jump.querySelector<HTMLElement>(".year-count");
        if (badge) badge.textContent = String(inGroup);
      }
      shown += inGroup;
    }
    for (const chip of chips) {
      if ((chip.dataset.area ?? ALL_AREAS) === area) chip.setAttribute("aria-current", "page");
      else chip.removeAttribute("aria-current");
    }
    status.textContent = caption(shown);
    if (push) history.pushState({ area }, "", areaHref(path, area));
  };

  root.addEventListener("click", (event) => {
    const chip = (event.target as Element | null)?.closest<HTMLAnchorElement>("[data-area-chip]");
    // Modified clicks keep their native meaning: open the filtered view in a new tab.
    if (!chip || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (chip.target && chip.target !== "_self") return;
    event.preventDefault();
    const area = chip.dataset.area ?? ALL_AREAS;
    apply(area, true);
    chip.focus({ preventScroll: true });
  });

  window.addEventListener("popstate", () => {
    apply(resolveArea(new URLSearchParams(location.search).get("area"), known), false);
  });

  // A page served with ?area=… ships the full list, so take the filter state from
  // the query on load rather than trusting the markup.
  const initial = resolveArea(new URLSearchParams(location.search).get("area"), known);
  if (initial !== ALL_AREAS) apply(initial, false);
}
