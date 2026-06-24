#!/usr/bin/env python3
"""figure.py — turn a PDF (best figure) or an image into a clean, transparent,
web-sized thumbnail. Reused by add_paper.py; also runnable on its own.

  python tools/figure.py INPUT OUTPUT [--max 560] [--no-bg] [--page-region]

INPUT  : a .pdf  -> extracts the largest sensible figure (or, with --page-region,
                    re-renders the region where the figures sit, for PDFs that
                    slice figures into strips)
         an image -> just cleaned/resized
OUTPUT : .png (transparency from white-background removal is kept)

White-background removal is *border-connected*: it only clears white that touches
the edges, so white *inside* the figure is preserved (no holes).
"""
import sys, os, io, argparse
import numpy as np
from scipy import ndimage
from PIL import Image
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

LANCZOS = Image.Resampling.LANCZOS


def remove_white_bg(im, thr=238):
    im = im.convert("RGBA")
    arr = np.array(im)
    if (arr[:, :, 3] < 250).mean() > 0.02:          # already has transparency
        return im
    r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    white = (r > thr) & (g > thr) & (b > thr)
    if not white.any():
        return im
    lab, _ = ndimage.label(white)
    border = (set(np.unique(lab[0, :])) | set(np.unique(lab[-1, :]))
              | set(np.unique(lab[:, 0])) | set(np.unique(lab[:, -1])))
    border.discard(0)
    if not border:
        return im
    arr[np.isin(lab, list(border)), 3] = 0
    return Image.fromarray(arr, "RGBA")


def _fit(im, m):
    w, h = im.size
    s = min(1.0, m / max(w, h))
    return im.resize((round(w * s), round(h * s)), LANCZOS) if s < 1.0 else im


def _best_embedded(doc, max_pages=6):
    best, barea = None, 0
    for p in range(min(max_pages, doc.page_count)):
        for img in doc[p].get_images(full=True):
            try:
                base = doc.extract_image(img[0])
            except Exception:
                continue
            w, h = base.get("width", 0), base.get("height", 0)
            if w < 260 or h < 200 or not (0.4 < w / h < 2.8):
                continue
            if w * h > barea:
                barea, best = w * h, base
    return Image.open(io.BytesIO(best["image"])) if best else None


def _page_region(doc, max_pages=6):
    best, barea = None, 0
    for p in range(min(max_pages, doc.page_count)):
        page = doc[p]
        rects = [r for img in page.get_images(full=True)
                 for r in page.get_image_rects(img[0]) if r.width > 40 and r.height > 10]
        if not rects:
            continue
        u = fitz.Rect(min(r.x0 for r in rects), min(r.y0 for r in rects),
                      max(r.x1 for r in rects), max(r.y1 for r in rects))
        if u.width < 150 or u.height < 120 or not (0.5 < u.width / u.height < 2.4):
            continue
        if u.width * u.height > barea:
            barea = u.width * u.height
            pix = page.get_pixmap(matrix=fitz.Matrix(2.4, 2.4), clip=u)
            best = Image.open(io.BytesIO(pix.tobytes("png")))
    return best


def make_thumbnail(inp, out, max_side=560, do_bg=True, page_region=False):
    if inp.lower().endswith(".pdf"):
        if fitz is None:
            raise SystemExit("PyMuPDF (fitz) is required for PDFs: pip install pymupdf")
        doc = fitz.open(inp)
        im = _page_region(doc) if page_region else (_best_embedded(doc) or _page_region(doc))
        doc.close()
        if im is None:
            raise SystemExit("no usable figure found in PDF (try --page-region)")
    else:
        im = Image.open(inp)
    im = _fit(im, max_side)
    im = remove_white_bg(im) if do_bg else im.convert("RGBA")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    im.save(out, "PNG", optimize=True)
    print(f"saved {out}  {im.size[0]}x{im.size[1]}  {os.path.getsize(out)//1024}KB")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="PDF/image -> clean transparent thumbnail")
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--max", type=int, default=560)
    ap.add_argument("--no-bg", action="store_true", help="keep the background")
    ap.add_argument("--page-region", action="store_true", help="render figure region (strip-sliced PDFs)")
    a = ap.parse_args()
    make_thumbnail(a.input, a.output, a.max, not a.no_bg, a.page_region)
