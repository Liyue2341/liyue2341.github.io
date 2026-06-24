#!/usr/bin/env python3
"""add_paper.py — add a publication from a DOI or arXiv id (auto-fills metadata),
optionally extracting a thumbnail from a PDF.

  python tools/add_paper.py 10.1038/s41467-024-55515-0  paper.pdf
  python tools/add_paper.py 2604.26703

Metadata comes from Crossref (DOI) or the arXiv API. The new entry is inserted at
the top of data/publications.json. THEN open the file and finish by hand:
  - author roles: add a trailing  *  (corresponding) and wrap  **co-first**  authors
  - set  "highlight": true  if it's a selected paper (shows on the homepage)
  - fill  "tags"
  - eyeball the figure
Finally:  python tools/validate.py
"""
import sys, os, json, re, time, urllib.request, urllib.parse, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import figure  # noqa: E402

UA = {"User-Agent": "liyue2341.github.io (mailto:yueli@ntu.edu.sg)"}


def _get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and i < tries - 1:
                time.sleep(3 * (i + 1))
                continue
            raise


def from_crossref(doi):
    m = json.loads(_get("https://api.crossref.org/works/" + urllib.parse.quote(doi)))["message"]
    authors = ", ".join(" ".join(filter(None, [a.get("given"), a.get("family")]))
                        for a in m.get("author", []))
    dp = (m.get("published") or m.get("issued") or {}).get("date-parts", [[None]])
    e = {"title": (m.get("title") or [""])[0], "authors": authors,
         "journal": (m.get("container-title") or [""])[0], "year": dp[0][0],
         "volume": m.get("volume"), "pages": m.get("page"),
         "doi": doi, "url": "https://doi.org/" + doi}
    return e


def from_arxiv(aid):
    import xml.etree.ElementTree as ET
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entry = ET.fromstring(_get("https://export.arxiv.org/api/query?id_list=" + aid).decode()).find("a:entry", ns)
    authors = ", ".join(a.find("a:name", ns).text for a in entry.findall("a:author", ns))
    return {"title": " ".join(entry.find("a:title", ns).text.split()), "authors": authors,
            "journal": "arXiv", "year": int(entry.find("a:published", ns).text[:4]),
            "arxiv": aid, "url": "https://arxiv.org/abs/" + aid,
            "pdf": "https://arxiv.org/pdf/" + aid}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    ident = sys.argv[1].strip().replace("https://doi.org/", "").replace("arXiv:", "")
    pdf = sys.argv[2] if len(sys.argv) > 2 else None

    entry = from_arxiv(ident) if re.match(r"^\d{4}\.\d{4,5}$", ident) else from_crossref(ident)
    entry = {k: v for k, v in entry.items() if v not in (None, "")}
    entry.update(citations=0, highlight=False, tags=[])

    if pdf:
        slug = slugify(entry["title"])
        out = os.path.join(ROOT, "assets", "img", "pubs", slug + ".png")
        try:
            figure.make_thumbnail(pdf, out)
            entry["image"] = f"assets/img/pubs/{slug}.png"
        except SystemExit as ex:
            print("  (figure skipped:", ex, ")")

    pj = os.path.join(ROOT, "data", "publications.json")
    pubs = json.load(open(pj, encoding="utf-8"))
    pubs.insert(0, entry)
    json.dump(pubs, open(pj, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("\nAdded to data/publications.json (top):\n")
    print(json.dumps(entry, ensure_ascii=False, indent=2))
    print("\nNow finish by hand in data/publications.json:")
    print("  - author roles:  Name*  (corresponding)   **Name**  (co-first)")
    print("  - set  \"highlight\": true  for a selected paper")
    print("  - fill  \"tags\"")
    print("Then:  python tools/validate.py")


if __name__ == "__main__":
    main()
