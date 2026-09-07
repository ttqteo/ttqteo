# Link cards in the post editor

Status: draft, awaiting review
Date: 2026-09-07

## Goal

Pasting a URL into the editor should be able to become a Notion-style
bookmark card — thumbnail, title, description, site name, URL — or, for
providers that permit it, an embedded player. Today a pasted URL becomes
a plain `<a>` and nothing else.

## Non-goals

- MDX posts. They render through a different path (`getAllBlogs` →
  `PostBody children`), so a card there would be an MDX component, not
  this node. Out of scope; the node is for editor-authored posts only.
- Live metadata. Cards snapshot what the unfurl returned at insert time.
- Editing a card's text by hand. The card is an atom; to change it,
  re-insert it.

## The constraint that shapes everything: content is stored as HTML

`SimpleEditor` calls `onChange(editor.getHTML())` and the string lands in
the Supabase `blogs.content` column. The public page renders it with
`dangerouslySetInnerHTML` inside `PostBody`. There is no JSON document
and no React on the read path.

Two consequences drive the rest of this design:

1. **A card is just HTML.** No renderer component is needed on the public
   page. Whatever `renderHTML` emits is what a reader gets.
2. **Tailwind cannot see it.** `tailwind.config.ts` scans `./app`,
   `./components`, `./src` for `.ts`/`.tsx` only. Utility classes that
   exist *solely* inside a database string get no CSS generated. A card
   written with `flex rounded-lg border` would look correct in dev
   (those classes are emitted for other files) and collapse in
   production once an unrelated refactor drops the last real usage.

   So the card markup carries **semantic class names only**, styled in
   `app/globals.css`. That file is processed by Tailwind, so `@apply`
   inside it is fine — the rule is about classes in stored HTML, not
   about avoiding Tailwind. `globals.css` already sets this precedent
   with `.code-line`, `.rehype-code-title`, `.highlight-line`, and
   `.admin-toolbar`.

## Node schema

One node, `linkCard`, with a `mode` attribute — not two nodes.

`parseHTML` is the piece most likely to break: if its selector misses,
reopening a saved post silently degrades every card back to a plain
link and the author loses layout they had arranged. One node means one
selector to get right instead of two. It also allows switching an
existing card between modes without deleting and re-inserting.

```
name:       linkCard
group:      block
atom:       true
draggable:  true
selectable: true

attributes:
  url          string             required, the canonical URL
  mode         "bookmark"|"embed" default "bookmark"
  title        string | null
  description  string | null
  image        string | null      absolute URL
  favicon      string | null      absolute URL
  siteName     string | null      e.g. "YouTube"
  author       string | null      e.g. "Lex Fridman"
  embedSrc     string | null      iframe src, only when mode=embed
```

`embedSrc` is the `src` extracted from the provider's oEmbed `html`, not
the whole iframe. Storing it snapshots the embed the same way — a
provider changing its URL shape cannot retroactively break published
posts — while remaining expressible in tiptap's `renderHTML` array spec,
which cannot inject raw HTML. It also means the iframe's own attributes
(`loading`, `referrerpolicy`, `allow`, `sandbox`) are ours to set rather
than whatever the provider happened to emit.

Corrected 2026-09-07 during planning: an earlier draft stored the full
`embedHtml`, which is not renderable through the node API.

## Serialization contract

`renderHTML` (bookmark mode):

```html
<a class="link-card" href="{url}" target="_blank" rel="noopener noreferrer"
   data-link-card="bookmark" data-url="{url}">
  <span class="link-card-body">
    <span class="link-card-title">{title}</span>
    <span class="link-card-desc">{description}</span>
    <span class="link-card-meta">
      <img class="link-card-favicon" src="{favicon}" alt="" />
      <span class="link-card-url">{url}</span>
    </span>
  </span>
  <img class="link-card-thumb" src="{image}" alt="" />
</a>
```

Inline elements inside the anchor (`span`, not `div`) because an `<a>`
containing block elements is invalid HTML and browsers will reparent it,
which breaks `parseHTML` on the next load.

The thumbnail comes **last in the markup but first visually** — the
reference screenshot puts it on the left. Text leads in the DOM so a
screen reader hits the title before the decorative image; CSS reorders
it. Do not "fix" this by moving the `<img>` up.

`renderHTML` (embed mode) builds the iframe from `embedSrc`:

```html
<div class="link-card-embed" data-link-card="embed" data-url="{url}"
     data-embed-src="{embedSrc}">
  <iframe src="{embedSrc}" loading="lazy" allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; clipboard-write; encrypted-media;
                 gyroscope; picture-in-picture"
          title="{title}"></iframe>
</div>
```

`loading="lazy"` matters: an embed high in a long post otherwise pulls
the provider's player bundle on first paint for every reader, including
the ones who never scroll to it.

`parseHTML` matches on `[data-link-card]` — an attribute, not a class.
Classes are a styling concern and may be renamed; the data attribute is
the format contract and must not change.

## Unfurl service

`lib/unfurl.ts`, called by `app/api/admin/unfurl/route.ts` behind
`isAdmin()`.

### Degradation ladder

Every step must produce a card that looks deliberate, never broken. A
card with only a URL and a favicon is a valid outcome, not a failure.

1. **oEmbed**, when the URL matches a provider in the registry.
2. **OpenGraph**, parsed from the fetched page.
3. **`<title>` + favicon**, when no OG tags exist.
4. **URL + favicon** only.

Steps 1 and 2 are *merged*, not alternatives. Verified against
`https://youtu.be/NYFGCESmikA` on 2026-09-07:

| Field | oEmbed | OpenGraph | Use |
|---|---|---|---|
| title | yes | yes | oEmbed (more stable) |
| description | **no** | yes | OG — this is the only source |
| image | hqdefault 480×360 | maxresdefault 1280×720 | **OG** (higher res) |
| iframe html | **yes** | no | oEmbed |
| author | yes | no | oEmbed |

Neither source alone produces the card in the reference screenshot:
oEmbed has no description, OG has no iframe.

### Provider registry

`{ match: RegExp, oembed: (url) => string, embeddable: boolean }`.

Verified working, no API key:

- YouTube — `https://www.youtube.com/oembed?url={url}&format=json`

To verify during implementation (endpoints are from documentation, not
yet exercised): Vimeo, SoundCloud, Spotify, CodePen, Figma. Each must be
hit once with a real URL before being added; an endpoint that 404s
should be left out rather than shipped hopefully.

X/Twitter oEmbed now generally requires authentication — treat it as
OG-only and do not offer embed.

### Fetch hygiene

- Send a browser `User-Agent`. Many sites return a login wall or empty
  body otherwise. (YouTube happens to serve `og:description` either way,
  but that is not typical.)
- Timeout 8s, follow at most 3 redirects, cap the response body at ~1MB
  — enough for `<head>`, and it stops a large file from being pulled
  into memory.
- Reject non-HTML content types before parsing.

### SSRF guard

The route fetches an arbitrary URL from the server. Admin-only, so the
risk is low, but the guard is cheap: resolve the host and reject
loopback, link-local, and RFC1918 ranges, plus non-http(s) schemes.
Re-check after redirects — a public URL can redirect to `127.0.0.1`.

## Embed allowlist

Embed is offered **only** when the matched provider has
`embeddable: true`. Most of the web sends `X-Frame-Options: DENY` or a
CSP `frame-ancestors` directive, so an embed of an arbitrary URL renders
as a blank box with no error — the same failure Notion has. Offering a
button that silently produces nothing is worse than not offering it.

For a non-embeddable URL the paste menu shows two choices, not three.

## Paste UX

`handlePaste` in `editorProps` intercepts a paste that is a bare URL on
an otherwise empty paragraph. Any other paste is left alone.

1. Insert the plain link immediately, so nothing is lost if the unfurl
   fails or the author walks away.
2. Fire the unfurl and show a choice menu anchored to the link, reusing
   the existing `BubbleMenu` (`simple-editor.tsx:345` already has a
   `shouldShow` predicate to extend).
3. Choices: **Link thường** (dismiss) · **Bookmark** · **Embed**
   (only when embeddable).
4. Choosing replaces the link with a `linkCard` node in one transaction,
   so a single undo returns to the plain link.

While the unfurl is in flight the menu shows a loading state rather than
appearing with empty buttons.

## CSS

`app/globals.css`, semantic classes only, `@apply` permitted:

```
.link-card         flex row, border, rounded, hover state, no underline
.link-card-body    column, min-width 0 so long titles can ellipsize
.link-card-title   1 line, ellipsis
.link-card-desc    2 lines, clamp, muted
.link-card-meta    row, small, muted
.link-card-thumb   fixed aspect, object-cover, hidden below ~480px
.link-card-embed   16:9 wrapper, iframe absolutely filling it
```

Cards must read correctly in both themes and inside `.prose`, which sets
`a` colour and underline — the card anchor has to opt out of both.

Missing fields collapse rather than leaving gaps: no image means no
thumbnail column, no description means the title and meta row close up.

## Existing content

Purely additive. Posts already containing plain links keep them; nothing
migrates. There is no way to bulk-convert existing links and none is
planned — an author who wants a card re-pastes the URL.

## Testing

- `lib/unfurl.test.ts` — pure unit tests over **fixture HTML strings**,
  no network: OG extraction, `<title>` fallback, relative-to-absolute
  favicon resolution, the oEmbed/OG merge precedence table above, and
  the SSRF host rejection list. Network calls are not tested; the
  provider endpoints are verified once by hand instead.
- Node round-trip: `renderHTML` → `parseHTML` returns identical
  attributes, for both modes and for a card whose optional fields are
  all null. This is the test that protects against the silent-degrade
  failure.

## Decisions taken, worth revisiting

1. **A step-4 card is still insertable.** When the unfurl yields only a
   URL and a favicon, Bookmark stays enabled and produces a minimal
   card. This matches Notion, and refusing would be worse: the author
   already chose to make a card, and a bare-URL card is a deliberate
   visual break in a wall of text. Reversible — disabling it later is a
   one-line change in the menu's enabled condition.
2. **Thumbnails are unoptimised.** Plain `<img>` rather than
   `next/image`, so no `next.config` `remotePatterns` entry is needed
   and any host works. The cost is no resizing and no size ceiling on
   what a card pulls in — a provider serving a 4MB PNG serves it to
   every reader. Accepted for now because the alternative is
   maintaining an allowlist of image hosts, which breaks the "any URL"
   goal the moment someone bookmarks an unfamiliar site.
