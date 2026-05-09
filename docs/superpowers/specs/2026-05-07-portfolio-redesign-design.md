# Portfolio Redesign — ttqteo.dev

**Date:** 2026-05-07
**Owner:** Quang Tran (ttqteo)
**Status:** Design — pending implementation plan

## 1. Context & Goal

The current site (`ttqteo.vercel.app`, Next.js 16 + Tailwind + shadcn + Supabase) functions as a personal blog with admin authoring. It is being redeployed to a custom domain `ttqteo.dev` and the owner wants a redesign because the current presentation feels under-polished — specifically project/case-study cards lack character, the site lacks identity, and navigation is loose.

The redesign covers three concerns:

- **A. Public pages redesign** — home, work, projects, lab, about, blog reader.
- **B. Admin/editor polish** — bring `/admin` and the TipTap editor in line with the new editorial tone.
- **C. Content-type expansion** — `/lab` becomes a first-class authored surface (notes, reading list, paper drafts) reusing the existing editor.

The site is hybrid: career portfolio + personal/dev playground + writing.

## 2. Direction

**"Editorial Index"** — typography-driven, Swiss-disciplined whitespace, single warm accent, dense typed lists. Reference: rauno.me, delba.dev. Retains the current hero spirit ("hi, i'm ttqteo / keep it simple, stupid").

### Typography
- **Display / headings:** Instrument Serif (fallback: Fraunces). Serif, medium weight.
- **Body:** Geist Sans (fallback: Inter).
- **Metadata / tags / type labels:** Geist Mono (fallback: JetBrains Mono).
- Hierarchy via size, weight, and spacing — not color.

### Color
- Light + dark mode (uses existing `next-themes`).
- Grayscale-led palette + **one warm accent** (terracotta `#E07856`) used sparingly for: link hover, current-page indicator, mono-tag highlight, focus ring.
- Dark background: warm near-black (`#0E0D0C`), not cool gray.

### Personality details (the "D" from brainstorming)
- "Currently" block on home — manually curated; optional "last commit X ago" pulled from GitHub at build/ISR time.
- View-transition animations between routes (Next.js View Transitions API).
- Keyboard shortcuts to jump nav (rauno-style): `g h`, `g w`, `g p`, `g b`, `g l`, `g a`.
- Subtle refresh-changing quote in footer.
- Existing blog view counter retained.

## 3. Information Architecture

```
/              Home — hero · currently · selected work · selected projects · recent writing
/work          Case studies (professional, private repos)
/projects      Open-source & personal projects
/blog          Writing — only posts of type='post'
/lab           Lab & Research — experiments (static), notes, reading, paper drafts
/about         Bio · education timeline · contact · socials
/admin         (auth-gated) authoring dashboard — redesigned
/admin/edit/*  (auth-gated) editor — redesigned
```

**Removed:** `/genogram`.
**Moved:** `/mindmap` → indexed under `/lab` as an experiment.
**Untouched routes:** `/docs`, `/auth/callback`, `/api/*`.

**Top nav (5 items):** `Work · Projects · Blog · Lab · About`.
**Footer:** social, "now" status line, RSS, full sitemap.

## 4. Page Specs

### 4.1 Home (`app/page.tsx` — full rewrite)

Layout: single column, max-width approximately 720px (current 600px is too narrow for table rows).

```
[Hero]                         (large, serif)
hi, i'm ttqteo                 link to /about
keep it simple, stupid         italic, muted

[Currently]                    (small caps mono label)
— Engineering at MozoX
— MIT @ UIT-VNU · 2025–2027
— Reading: <last paper/book>

[Selected Work]      see all → (link to /work)
3 IndexTable rows

[Selected Projects]  see all → (link to /projects)
3 IndexTable rows

[Recent Writing]     see all → (link to /blog)
3 latest published posts

[Footer]
```

The `Currently` block is sourced from a single config file (`data/currently.ts`) — manually edited, no auth surface needed.

### 4.2 `/work` — Case Studies

Full IndexTable of all entries from `data/case-studies.ts`. No detail pages in this phase (clicking a row opens external link if available, otherwise a no-op until phase 2).

### 4.3 `/projects`

Full IndexTable of all entries from `data/projects.ts`. Same row format. External links for npm/GitHub/demo open in new tab.

### 4.4 `/lab`

Hybrid source:

- **Static experiments** from `data/lab.ts` (e.g., mindmap renderer) — like projects, code-only.
- **Authored content** from `blogs` table where `type IN ('note','reading','paper')`.

Both merged into a single IndexTable, sorted by year descending. Each row prefixed by a mono `type` tag: `[experiment]`, `[note]`, `[reading]`, `[paper]`.

Authored items link to `/lab/[slug]` (a reader page mirroring `/blog/[slug]`). Static experiments link to internal route (e.g. `/mindmap`) or external as appropriate.

### 4.5 `/blog` (reader unchanged in structure)

Reader pages keep current MDX + DB rendering pipeline. List page redesigned to match IndexTable style. Query filter: only `type='post'` for DB posts; MDX posts always show.

### 4.6 `/about`

Single column, generous whitespace. Sections:
- Bio paragraph (warm, first-person, short)
- Currently (mirrors home block, can be longer here)
- Education timeline — three rows from CV (MIT @ UIT 2025–2027, BSc Embedded @ HCMUS, BA English Lit @ Hue)
- Skills — mono tag cluster
- Contact — email, LinkedIn, GitHub, RSS

## 5. Component Specs

### 5.1 `IndexTable` (new) — replaces `ProjectCard` and `CaseStudyCard`

A generic row-based list. One row per entry with these columns:

```
[year]  [title]                [role]      [stack tags mono]      [→ link icon]
```

- Year: mono, muted.
- Title: serif, click target for the row. If entry has a primary external link (npm/GitHub), the row's primary action opens that link.
- Role: small caps mono (`solo`, `lead`, `team`).
- Stack: mono tags, comma-separated, truncated on small screens (max 3 visible, "+N" for overflow).
- Link icon: indicates external (↗) vs internal (→).
- Hover: row background subtle warm tint, accent line on the left edge.
- Type prefix (only on `/lab`): `[experiment] / [note] / [reading] / [paper]` rendered as mono tag at the start of the title cell.

Props:
```ts
type IndexEntry = {
  year: number | string;
  title: string;
  role?: 'solo' | 'lead' | 'team';
  stack?: string[];
  metric?: string;          // e.g. "npm 1.2k", optional
  href: string;             // internal or external
  external?: boolean;
  type?: 'experiment' | 'note' | 'reading' | 'paper'; // lab only
};
```

Entries omit screenshot/cover image and status — per brainstorm decision (kept: stack, metric, role, year, links).

### 5.2 `Hero` (new)
Renders the home hero block. Static content, no props needed.

### 5.3 `CurrentlyBlock` (new)
Reads from `data/currently.ts` and renders a small-caps label + 3 dash-prefixed lines.

### 5.4 `Footer` (rewrite)
Sitemap, social, RSS, optional refreshing-quote slot, current-status line.

### 5.5 Components removed
- `components/portfolio/ProjectCard.tsx`
- `components/portfolio/CaseStudyCard.tsx`
- `app/genogram/*`

### 5.6 Components retained
- `Navbar` — restyled (typography, accent, keyboard hint affordance), structure unchanged.
- `components/markdown/*`, blog reader pipeline, view counter.
- `components/editor/*` — see B & C below for upgrades.

## 6. Admin & Editor (Concern B)

The current `/admin` already supports Google OAuth via Supabase, admin gate, MDX + DB post listing, publish toggle, soft-delete, and TipTap editing. The redesign polishes the surface and extends it.

### 6.1 `/admin` dashboard polish
- Replace ad-hoc card-list with the same `IndexTable` pattern (uniform with public pages).
- Columns: `[updated] [title] [type] [status] [source]  [actions]`.
- Filters: by `type` (post/note/reading/paper), by status (published/draft), by source (db/mdx). Filters as mono tag toggles.
- "New" action becomes a small dropdown: New Post · New Note · New Reading · New Paper. Each preselects `type` in the editor.

### 6.2 Editor polish
- Distraction-free write mode toggle (hides chrome, centers prose, max-width approximately 680px).
- Match public typography stack so what-you-see is what-renders.
- Add a `type` selector in the editor toolbar (defaults from the "New X" entry point).
- Add a "preview" tab that renders with the public reader pipeline.

### 6.3 Out-of-scope for this redesign
- Multi-author. Single-author (admin-gated) only.
- Public draft preview links. Drafts visible only to admin.
- Image management UI. Existing `use-image-upload` flow retained as-is.

## 7. Content-Type Expansion (Concern C)

### 7.1 Schema change

Add a `type` column to `blogs`:

```sql
ALTER TABLE blogs
  ADD COLUMN type text NOT NULL DEFAULT 'post'
  CHECK (type IN ('post','note','reading','paper'));

CREATE INDEX blogs_type_idx ON blogs(type) WHERE deleted_at IS NULL;
```

Migration file: `supabase/add_blogs_type_column.sql`. All existing rows backfill to `'post'`.

### 7.2 Reader routing
- `/blog/[slug]` continues to render `type='post'` rows. Other types 404 here.
- `/lab/[slug]` (new) renders `type IN ('note','reading','paper')`. Reuses the existing markdown render pipeline.
- Static lab experiments do not go through `/lab/[slug]`; they keep their own routes (e.g. `/mindmap`).

### 7.3 RSS / sitemap
- RSS feed continues to include `type='post'` only (writing-focused).
- Sitemap includes all published reader pages across types.

### 7.4 MDX content (`contents/blogs/*.mdx`)
Unchanged. MDX posts implicitly act as `type='post'`; if a contributor wants to write a `note` they can either:
- Author it via the new admin editor (DB), or
- Add a frontmatter field `type: note` on an MDX file (the loader will be extended to read it and route accordingly).

## 8. Data files

```
data/
  currently.ts        // 3-line "Currently" block content
  projects.ts         // existing — extended to match IndexEntry shape
  case-studies.ts     // existing — extended to match IndexEntry shape
  lab.ts              // new — static lab experiments
```

Minor field additions to existing project/case-study entries: `year`, `role`, `stack`, `metric`, `href`, `external` — to feed `IndexTable`. Existing fields not used by the new card are kept (no data destruction) but become unused. Cleanup is explicit and noted in the implementation plan, not silent.

## 9. Tech & Stack

- Next.js 16, React 19, Tailwind 3, shadcn, Supabase — all retained.
- Add Google Fonts (Instrument Serif, Geist, Geist Mono) via `next/font`.
- No new runtime dependencies expected. View transitions use built-in Next.js API.

## 10. Out of Scope (Future Phases)

- Project / case-study detail pages (deep dives with MDX bodies).
- "Now playing" Spotify integration.
- Custom OG image generator.
- Cross-content-type search.
- Public draft preview share links.
- Multi-author / contributor flow.

## 11. Acceptance Criteria

- All five top-nav routes (`/work`, `/projects`, `/blog`, `/lab`, `/about`) render with `IndexTable` content sourced from `data/*` and Supabase as specified.
- Home renders Hero, Currently, three "selected" sections, redesigned footer.
- Admin dashboard uses `IndexTable` and supports filtering by type, status, source.
- Editor has a `type` selector and a distraction-free mode.
- `blogs.type` column exists with the four allowed values; existing rows backfilled to `'post'`.
- `/lab/[slug]` renders DB content where `type != 'post'`; `/blog/[slug]` continues to render only `type='post'`.
- `/genogram` removed; `/mindmap` linked from `/lab`.
- Light + dark themes both work; warm accent visible in both.
- View transitions animate between routes; keyboard shortcuts (`g h/w/p/b/l/a`) jump correctly.

## 12. Open Questions for Reviewer

- Confirm thesis topic (or accept "TBD" placeholder for the `Currently` reading line and any `[paper]` lab row).
- Confirm accent color value `#E07856` is acceptable, or pick a different warm accent.
- Confirm font choices (Instrument Serif / Geist / Geist Mono) or substitute.
