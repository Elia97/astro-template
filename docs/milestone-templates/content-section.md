---
name: "{{section_name}} section"
description: New content collection with listing + detail pages, wired into SEO/sitemap.
---

# {{section_name}} section

Adds a new content-collection-backed section (listing + detail pages) end to
end: schema, pages, SEO plumbing. Reach for this when the client needs a
recurring content type (blog, case studies, FAQ, portfolio...) beyond the
homepage.

## Sub-tasks

### 1. feat(content): add {{collection_name}} content collection schema

**Agent:** content-agent
**Labels:** enhancement

Zod schema for {{collection_name}} (title, description, publishedAt, cover
image, tags, draft flag), loader registered in `content.config.ts`, 2 example
entries as seed content.

Checklist:
- [ ] Schema in `content.config.ts` with typed frontmatter
- [ ] 2 example entries under `src/content/{{collection_name}}/`
- [ ] `astro sync` + `pnpm run typecheck` clean

### 2. feat({{collection_name}}): add listing page

**Agent:** ui-agent
**Labels:** enhancement

`/{{route_segment}}/` index page, reusing existing `ui/card` primitives,
chronological order, empty-state when no entries exist yet.

Checklist:
- [ ] `src/pages/{{route_segment}}/index.astro`
- [ ] Empty-state UI
- [ ] Accessible markup (heading hierarchy, landmark)

### 3. feat({{collection_name}}): add detail page

**Agent:** ui-agent
**Labels:** enhancement

`/{{route_segment}}/[slug]/` via `getStaticPaths`, renders the entry body,
back-link to the listing. Rendering strategy (prerender vs SSR) per
`docs/guides/rendering-performance.md` if it exists.

Checklist:
- [ ] `src/pages/{{route_segment}}/[slug].astro`
- [ ] Explicit `prerender` choice with rationale
- [ ] 404 for unknown/draft slugs

### 4. feat(seo): sitemap + metadata for {{collection_name}}

**Agent:** seo-agent
**Labels:** enhancement

Canonical/OG/JSON-LD (Article or CollectionPage) on listing+detail, sitemap
inclusion, noindex on draft entries.

Checklist:
- [ ] JSON-LD on detail pages
- [ ] Draft entries excluded from sitemap / noindex
- [ ] OG image fallback to `public/og-default.png` when entry has none

### 5. docs(guides): codify {{collection_name}} patterns

**Agent:** general-purpose
**Labels:**

Update (or create) `docs/guides/content-collections.md` with the schema/loader
pattern established above, so future sections reuse it instead of
re-deriving it.

Checklist:
- [ ] `docs/guides/content-collections.md` updated
