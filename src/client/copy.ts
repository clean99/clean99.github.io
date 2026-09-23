const RESET_MS = 2000;

function canonicalUrl(): string {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href.split("#")[0]!;
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy-link]")) {
  const label = button.querySelector<HTMLElement>("[data-copy-label]") ?? button;
  const idle = label.textContent ?? "";
  let timer: number | undefined;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl());
    } catch {
      return;
    }
    label.textContent = button.dataset.copied ?? idle;
    button.dataset.state = "copied";
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      label.textContent = idle;
      delete button.dataset.state;
    }, RESET_MS);
  });
}
