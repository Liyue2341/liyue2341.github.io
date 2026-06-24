#!/usr/bin/env python3
"""add_post.py — scaffold a new blog post.

  python tools/add_post.py "Why I switched to X" --tags methods,meta

Blog posts are one folder each:  blog/<slug>/index.md  (the body) + the post's
images in the SAME folder, referenced as  ![alt](fig1.jpg) . This script creates
that folder + a starter index.md and adds an entry to data/blog.json.
"""
import sys, os, json, re, argparse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50]


def main():
    ap = argparse.ArgumentParser(description="scaffold a blog post")
    ap.add_argument("title")
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--tags", default="")
    a = ap.parse_args()

    slug = slugify(a.title)
    folder = os.path.join(ROOT, "blog", slug)
    os.makedirs(folder, exist_ok=True)
    md = os.path.join(folder, "index.md")
    if not os.path.exists(md):
        with open(md, "w", encoding="utf-8") as f:
            f.write("Write your post here.\n\n"
                    "Drop images in this same folder and reference them like "
                    "`![a caption](fig1.jpg)`. Code, `$math$`, and `$$display math$$` all work.\n")

    bj = os.path.join(ROOT, "data", "blog.json")
    posts = json.load(open(bj, encoding="utf-8"))
    if any(p.get("slug") == slug for p in posts):
        print("already in index:", slug)
    else:
        posts.insert(0, {"slug": slug, "title": a.title, "date": a.date, "summary": "",
                         "tags": [t.strip() for t in a.tags.split(",") if t.strip()]})
        json.dump(posts, open(bj, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("created:", os.path.relpath(md, ROOT))
    print("live at: post.html?slug=" + slug)
    print("-> write the body in that file, and set the summary in data/blog.json")


if __name__ == "__main__":
    main()
