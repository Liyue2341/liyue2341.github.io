# Yue Li — personal academic site

Clean-academic homepage (al-folio–inspired) for **Yue Li (李越)**. Pure static —
plain HTML/CSS/vanilla JS, no build step. Content lives in JSON + Markdown so the
site deploys to GitHub Pages as-is.

## Single source of truth

```
data/profile.json        bio, title, links, interests
data/publications.json   one object per paper
data/projects.json       open-source repos
data/news.json           short dated updates
data/blog.json           the blog index (metadata for each post)
blog/<slug>.md           the body of each post (Markdown)
```

## Crafted features (not just a brochure)

- **⌘K command palette** — press ⌘K / Ctrl-K (or `/`) anywhere to fuzzy-search
  publications, posts, and pages; arrow keys + Enter to jump.
- **Per-paper BibTeX** — every publication has a **Bib** button that reveals an
  auto-generated BibTeX entry with one-click copy.
- **Auto table-of-contents** — posts with 3+ headings get a generated Contents box.
- Light/dark theme (follows the OS, remembers your manual choice).

## How to maintain it

**Add a paper** — prepend an object to `data/publications.json`:

```json
{
  "title": "Paper title",
  "authors": "**Yue Li**, Coauthor A, Coauthor B",
  "journal": "Nature",
  "year": 2026,
  "volume": "12(3)", "pages": "100-110",
  "doi": "10.1038/xxxxx",
  "url": "https://doi.org/10.1038/xxxxx",
  "citations": 0, "highlight": true,
  "tags": ["AI", "CNT"]
}
```

- Mark roles in the `authors` string: add a trailing `*` to a corresponding author,
  e.g. `Jin Zhang*` (shows a superscript `*`). Wrap co-first authors in `**...**`;
  when `**Yue Li**` is among them the entry shows a small "(co-first)" note. A name
  can be both, e.g. `**Liu Qian***`. Your own name `Yue Li` is highlighted
  automatically. BibTeX strips these markers.
- `"highlight": true` shows the paper on the homepage (★) under *Selected publications*.
- For preprints set `"journal": "arXiv"` and `"arxiv": "2601.12345"`.

**Write a post** — create `blog/my-slug.md` (Markdown body; supports code, `$math$`,
`$$display math$$`, images, blockquotes), then add an entry to the **top** of
`data/blog.json`:

```json
{ "slug": "my-slug", "title": "Title", "date": "2026-06-30", "summary": "One line.", "tags": ["methods"] }
```

It goes live at `post.html?slug=my-slug`.

**Update bio / news / interests** — edit `data/profile.json` and `data/news.json`.

**Swap the portrait** — the about page shows a monogram placeholder
(`assets/img/profile.svg`). To use a real photo, drop e.g. `assets/img/profile.jpg`
in and change the `src` of `<img class="portrait" …>` in `index.html`.

## Local preview

`fetch()` needs HTTP (not `file://`), so serve the folder:

```bash
python -m http.server 8099 --directory .
# open http://localhost:8099
```

## Deploy (GitHub Pages — personal user site)

This is a **user site** on the personal account. Push to the `main` branch of
`Liyue2341/liyue2341.github.io` and it serves at `https://liyue2341.github.io`.

```bash
git init && git add . && git commit -m "Personal academic site"
git branch -M main
git remote add origin git@github.com:Liyue2341/liyue2341.github.io.git
git push -u origin main
```

Then **Settings → Pages → Deploy from a branch → `main` / root**. `.nojekyll`
tells Pages to serve files as-is (skip Jekyll). Paths are relative, so it serves
correctly at the domain root.

## Data is portable

Content is plain JSON under `data/`, so another site can consume the same files at
build time (via the public raw file URLs) instead of duplicating them.
