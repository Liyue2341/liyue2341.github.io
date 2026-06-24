# Maintaining this site

No backend, no build step. The whole site is plain files in this repo; you edit
data, optionally run a helper script, then push. This page is the human guide;
`tools/CONTEXT.md` is the same thing written for an AI agent picking up the project.

## Where everything lives (single source of truth)

```
data/profile.json        bio, title, links, interests, stats
data/publications.json   one object per paper
data/news.json           short dated updates (home page)
data/projects.json       (optional) open-source repos
data/blog.json           the blog index — metadata for each post
blog/<slug>/index.md     a post's body
blog/<slug>/*.jpg|png    that post's images (referenced as ![](fig1.jpg))
assets/img/pubs/         publication thumbnails
assets/pdf/              hosted paper PDFs
```

## The helper scripts (run with your Python)

```bash
# add a paper from a DOI or arXiv id; pass a PDF to also make the thumbnail
python tools/add_paper.py 10.1038/s41467-024-55515-0  paper.pdf
python tools/add_paper.py 2604.26703

# start a new blog post (makes blog/<slug>/index.md + a blog.json entry)
python tools/add_post.py "Why I switched to X" --tags methods,meta

# make/clean one thumbnail (PDF -> best figure, white bg -> transparent, resized)
python tools/figure.py paper.pdf assets/img/pubs/my-paper.png
python tools/figure.py paper.pdf out.png --page-region   # for strip-sliced PDFs

# ALWAYS run before pushing — catches bad JSON and missing files
python tools/validate.py
```

## Common tasks

**Add a paper.** `add_paper.py <doi|arxiv> [pdf]` fills title/authors/journal/year/
pages and (with a PDF) the thumbnail. Then open `data/publications.json` and finish:
mark author roles, set `highlight`, fill `tags`. Then `validate.py`.

**Author roles** (in the `authors` string):
- corresponding author → trailing `*`, e.g. `Jin Zhang*`
- co-first authors → wrap in `**...**`; when `**Yue Li**` is among them the entry
  shows a small `(co-first)` note. Both at once: `**Liu Qian***`.
- your own name `Yue Li` is highlighted automatically. Markers are stripped from BibTeX.

**Write / edit a post.** `add_post.py "Title"` scaffolds `blog/<slug>/index.md`;
write Markdown there, drop images in the same folder, set the one-line `summary` in
`data/blog.json`. It's live at `post.html?slug=<slug>`.

**Change one specific post later.** Every post is its own folder keyed by slug.
The URL is `post.html?slug=<slug>` — give that slug (or the post's URL) and edit only
`blog/<slug>/index.md`. Nothing else is touched.

**Edit bio / news / interests.** `data/profile.json` and `data/news.json`.

**Swap the photo.** Replace `assets/img/profile.jpg` (≈500px wide is plenty).

## Preview locally, then deploy

```bash
python -m http.server 8099 --directory .     # open http://localhost:8099
python tools/validate.py                     # must pass
git add . && git commit -m "..." && git push # GitHub Pages redeploys
```

It's the user site `Liyue2341/liyue2341.github.io` → serves at `https://liyue2341.github.io`.
