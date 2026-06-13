# Browser Support

Enhanced refraction is intentionally conservative.

| Environment                    | Mode                                 |
| ------------------------------ | ------------------------------------ |
| Chrome / Chromium desktop      | Enhanced when capability checks pass |
| Chrome / Chromium mobile       | Fallback by default                  |
| Safari / iOS Safari            | Fallback or solid                    |
| Firefox                        | Fallback or solid                    |
| `prefers-reduced-motion`       | No elastic hover animation           |
| `prefers-reduced-transparency` | Solid                                |
| `prefers-contrast: more`       | Stronger borders and contrast        |

The package uses `CSS.supports`, runtime capability checks, user preferences, and provider settings. It does not trust user agent strings alone.
