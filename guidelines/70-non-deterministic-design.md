# File: guidelines/70-non-deterministic-design.md

# Non-Deterministic Design Rules (AI outputs vary)

Design must handle:

* Very short or very long content
* Missing fields (no images, prices, ratings)
* Too many results (truncate + Show more)
* Conflicting sources

## Layout must never break

* Clamp long titles + wrap text
* Avoid page-level horizontal scroll
* Tables may scroll horizontally inside their container only
* Use collapsible sections for dense content

## Fallback behavior

If tools fail or data is missing:

* Render InfoCard:

  * what we know
  * what’s missing
  * one question to proceed
* Add ActionBar: Try again / Search web / Change query
