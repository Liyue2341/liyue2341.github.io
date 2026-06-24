#!/usr/bin/env python3
"""validate.py — check the site's content is well-formed before you push.

  python tools/validate.py        (exit code 0 = OK, 1 = problems)

Catches: unparseable JSON, missing required fields, and image/PDF/post-body files
that are referenced but don't exist. Run it after editing data by hand.
"""
import os, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []


def jload(rel):
    try:
        return json.load(open(os.path.join(ROOT, rel), encoding="utf-8"))
    except Exception as e:
        errors.append(f"{rel}: invalid JSON -- {e}")
        return None


def exists(rel):
    return os.path.exists(os.path.join(ROOT, rel))


pubs = jload("data/publications.json") or []
for i, p in enumerate(pubs):
    for field in ("title", "authors", "journal", "year"):
        if not p.get(field):
            errors.append(f"publications[{i}] missing '{field}'")
    if p.get("image") and not exists(p["image"]):
        errors.append(f"publications[{i}] image not found: {p['image']}")
    if p.get("pdf") and not p["pdf"].startswith("http") and not exists(p["pdf"]):
        errors.append(f"publications[{i}] pdf not found: {p['pdf']}")

posts = jload("data/blog.json") or []
for i, p in enumerate(posts):
    if not p.get("slug"):
        errors.append(f"blog[{i}] missing 'slug'")
    elif not exists(f"blog/{p['slug']}/index.md"):
        errors.append(f"blog[{i}] body not found: blog/{p['slug']}/index.md")

for rel in ("data/news.json", "data/projects.json"):
    jload(rel)

prof = jload("data/profile.json") or {}
for field in ("name", "title", "bio", "links"):
    if field not in prof:
        errors.append(f"profile.json missing '{field}'")

if errors:
    print("VALIDATION FAILED ({} problem(s)):".format(len(errors)))
    for e in errors:
        print("  [x]", e)
    sys.exit(1)
print(f"OK -- {len(pubs)} publications, {len(posts)} posts, profile + news + projects valid, all files present.")
