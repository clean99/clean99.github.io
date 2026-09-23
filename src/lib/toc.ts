export interface HeadingPosition {
  id: string;
  /** Distance from the viewport top, in px (getBoundingClientRect().top). */
  top: number;
}

/**
 * The section being read is the last heading that has scrolled past the
 * reading line. Before the first heading, nothing is active.
 */
export function activeHeading(headings: readonly HeadingPosition[], readingLine: number): string | undefined {
  let active: string | undefined;
  for (const heading of headings) {
    if (heading.top <= readingLine) active = heading.id;
    else break;
  }
  return active;
}
