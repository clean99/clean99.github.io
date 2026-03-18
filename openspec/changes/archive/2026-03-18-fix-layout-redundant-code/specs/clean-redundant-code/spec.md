## ADDED Requirements

### Requirement: Title variable uses single assignment

The `title` variable in `layout.ejs` SHALL be declared with a single assignment (`var title = config.title`), not a redundant double assignment.

#### Scenario: Title variable declaration

- **WHEN** layout.ejs is rendered for any page
- **THEN** the title variable SHALL be assigned exactly once via `var title = config.title`
- **AND** the subsequent conditional logic (is_archive, is_post, is_page, is_tag) SHALL remain unchanged

### Requirement: URL cleanup uses single replace call

All `url.replace(/index\.html$/, '')` expressions in `layout.ejs` SHALL appear exactly once per usage site, not chained with a duplicate `.replace()` call.

#### Scenario: Canonical link URL cleanup

- **WHEN** the `<link rel="canonical">` tag is rendered
- **THEN** the href SHALL apply `.replace(/index\.html$/, '')` exactly once
- **AND** the resulting URL SHALL be identical to the previous double-replace output

#### Scenario: Open Graph URL cleanup

- **WHEN** the `<meta property="og:url">` tag is rendered
- **THEN** the content SHALL apply `.replace(/index\.html$/, '')` exactly once
- **AND** the resulting URL SHALL be identical to the previous double-replace output

#### Scenario: Twitter URL cleanup

- **WHEN** the `<meta name="twitter:url">` tag is rendered
- **THEN** the content SHALL apply `.replace(/index\.html$/, '')` exactly once
- **AND** the resulting URL SHALL be identical to the previous double-replace output
