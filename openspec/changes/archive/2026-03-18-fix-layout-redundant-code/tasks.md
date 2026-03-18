## 1. Fix Redundant Assignment

- [x] 1.1 Change `var title = title = config.title` to `var title = config.title` on line 18

## 2. Fix Duplicate Replace Calls

- [x] 2.1 Remove duplicate `.replace(/index\.html$/, '')` from canonical link (line 33)
- [x] 2.2 Remove duplicate `.replace(/index\.html$/, '')` from og:url meta (line 62)
- [x] 2.3 Remove duplicate `.replace(/index\.html$/, '')` from twitter:url meta (line 78)

## 3. Verify

- [x] 3.1 Run `hexo generate` to confirm template renders without errors
