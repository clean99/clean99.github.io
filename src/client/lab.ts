/**
 * AI Coding Lab filtering. The catalog is rendered into the HTML at build time,
 * so search and filters only ever hide or show nodes that are already there:
 * with JavaScript off, the full catalog is what a reader sees.
 */
function initLab(): void {
  const root = document.querySelector<HTMLElement>("[data-lab-catalog]");
  const controls = document.querySelector<HTMLElement>("[data-lab-controls]");
  if (!root || !controls) return;

  const search = controls.querySelector<HTMLInputElement>("[data-lab-search]");
  const buttons = Array.from(controls.querySelectorAll<HTMLButtonElement>("[data-lab-filter]"));
  const items = Array.from(root.querySelectorAll<HTMLLIElement>(".item"));
  const groups = Array.from(root.querySelectorAll<HTMLElement>("[data-lab-group]"));
  const empty = document.querySelector<HTMLElement>("[data-lab-empty]");
  const filesSection = root.querySelector<HTMLElement>("section");

  let filter = "all";
  let terms: string[] = [];

  const matches = (item: HTMLLIElement): boolean => {
    const kind = item.dataset.kind;
    const redacted = item.dataset.redacted === "true";
    if (filter === "redacted" && !redacted) return false;
    if ((filter === "skill" || filter === "file") && kind !== filter) return false;
    // Same rule as `matchesQuery` in src/lib/lab.ts: every term, in any order.
    if (terms.length > 0 && !terms.every((term) => (item.dataset.search ?? "").includes(term))) return false;
    return true;
  };

  const apply = (): void => {
    for (const item of items) item.hidden = !matches(item);
    if (filesSection) {
      filesSection.hidden = !items.some((item) => item.dataset.kind === "file" && !item.hidden);
    }
    for (const group of groups) {
      group.hidden = !group.querySelector(".item:not([hidden])");
    }
    if (empty) empty.hidden = items.some((item) => !item.hidden);
  };

  controls.hidden = false;

  for (const button of buttons) {
    button.addEventListener("click", () => {
      filter = button.dataset.labFilter ?? "all";
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      apply();
    });
  }

  search?.addEventListener("input", () => {
    terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    apply();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLab, { once: true });
} else {
  initLab();
}
