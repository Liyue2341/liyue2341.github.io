/* =========================================================================
   Yue Li — site logic. Vanilla JS, no build step.
   Pages opt in via <body data-page="home|publications|blog|post">.
   ========================================================================= */
(function () {
  "use strict";

  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---- data (deduped fetch cache) ------------------------------------- */
  const _cache = {};
  function getJSON(path) {
    return (_cache[path] = _cache[path] || fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${path} (${r.status})`);
      return r.json();
    }));
  }
  async function getText(path) {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(`Failed to load ${path} (${r.status})`);
    return r.text();
  }

  /* ---- helpers -------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmtDate(s) {
    const p = String(s).split("-");
    const y = p[0];
    if (p.length === 1) return y;
    const m = MON[parseInt(p[1], 10) - 1] || "";
    if (p.length === 2) return `${m} ${y}`;
    return `${m} ${parseInt(p[2], 10)}, ${y}`;
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  // **X** -> <strong>; highlight owner name
  // a trailing * = corresponding (shows a superscript *) ; **X** = co-first (the entry
  // gets a "(co-first)" note when Yue Li is wrapped) ; highlight the owner.
  function fmtAuthors(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*/g, '<sup class="role" title="Corresponding author">*</sup>')
      .replace(/Yue Li/g, '<span class="me">Yue Li</span>');
  }
  function venue(pub) {
    if (pub.journal === "arXiv" && pub.arxiv) return `arXiv:${pub.arxiv} (${pub.year})`;
    let v = pub.journal;
    if (pub.volume) v += ` ${pub.volume}`;
    if (pub.pages) v += `, ${pub.pages}`;
    return `${v} (${pub.year})`;
  }

  function bibtex(pub) {
    const clean = pub.authors.replace(/[*†]/g, "").replace(/\s+/g, " ").trim();
    const parts = clean.split(",").map((s) => s.trim()).filter(Boolean);
    const authorList = parts.join(" and ");
    const firstLast = (parts[0] || "ref").split(" ").pop().toLowerCase();
    const titleWord = ((pub.title.match(/[A-Za-z]+/g) || ["ref"])[0]).toLowerCase();
    const key = `${firstLast}${pub.year}${titleWord}`;
    const isPre = pub.journal === "arXiv";
    const fields = isPre
      ? [["title", pub.title], ["author", authorList], ["year", pub.year], ["eprint", pub.arxiv], ["archivePrefix", "arXiv"]]
      : [["title", pub.title], ["author", authorList], ["journal", pub.journal], ["year", pub.year], ["volume", pub.volume], ["pages", pub.pages], ["doi", pub.doi]];
    const body = fields.filter((f) => f[1]).map(([k, v]) => `  ${k} = {${v}}`).join(",\n");
    return `@${isPre ? "misc" : "article"}{${key},\n${body}\n}`;
  }

  function pubLinks(pub) {
    const out = [];
    if (pub.doi) out.push(`<a class="ab-btn" href="https://doi.org/${pub.doi}" target="_blank" rel="noopener noreferrer">DOI</a>`);
    if (pub.arxiv) out.push(`<a class="ab-btn" href="https://arxiv.org/abs/${pub.arxiv}" target="_blank" rel="noopener noreferrer">arXiv</a>`);
    if (pub.url && !pub.arxiv) out.push(`<a class="ab-btn" href="${pub.url}" target="_blank" rel="noopener noreferrer">HTML</a>`);
    return out.join("");
  }

  function pubThumb(pub) {
    return pub.image ? `<div class="pub-thumb"><img src="${esc(pub.image)}" alt="" loading="lazy"></div>` : "";
  }
  function pdfBtn(pub) {
    if (!pub.pdf) return "";
    const ext = /^https?:/.test(pub.pdf);
    return `<a class="ab-btn" href="${esc(pub.pdf)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ' download'}>PDF</a>`;
  }

  function pubHTML(pub) {
    const href = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : "#");
    const cite = pub.citations ? `<span class="pub-cite">cited ${pub.citations}</span>` : "";
    const af = (pub.tags || []).some((t) => /April Fools/i.test(t)) ? ` <span class="af-badge">🎭 April Fools'</span>` : "";
    const cf = /\*\*Yue Li\*\*/.test(pub.authors) ? ` <span class="cf-note">(co-first)</span>` : "";
    const aw = pub.award ? ` <span class="award-badge">${esc(pub.award)}</span>` : "";
    return `<article class="pub">
      ${pubThumb(pub)}
      <div class="pub-main">
        <p class="pub-title"><a href="${href}" target="_blank" rel="noopener noreferrer">${esc(pub.title)}</a></p>
        <p class="pub-authors">${fmtAuthors(pub.authors)}</p>
        <p class="pub-venue">${esc(venue(pub))}${cf}${af}${aw}</p>
        <div class="pub-btns">
          ${pdfBtn(pub)}
          ${pubLinks(pub)}
          <button class="ab-btn" type="button" data-bib aria-expanded="false">Bib</button>
          ${cite}
        </div>
        <div class="bibtex" hidden><button class="ab-btn copy" type="button">Copy</button><pre><code>${esc(bibtex(pub))}</code></pre></div>
      </div>
    </article>`;
  }

  function postRow(p) {
    const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    return `<article class="post-row">
      <div class="date">${fmtDate(p.date)}</div>
      <h3><a href="post.html?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h3>
      <p>${esc(p.summary || "")}</p>
      <div class="tags">${tags}</div>
    </article>`;
  }

  const ICON = {
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path fill="currentColor" d="M5 13.18v3.32C5 18.43 8.13 20 12 20s7-1.57 7-3.5v-3.32l-7 3.82-7-3.82Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" stroke-width="1.8"/></svg>',
    orcid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.2 6.8a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM7.3 10.3h1.8v7.3H7.3v-7.3Zm3.3 0h3.4c2.4 0 3.8 1.6 3.8 3.65 0 2.1-1.5 3.65-3.85 3.65h-3.35v-7.3Zm1.8 1.6v4.1h1.45c1.45 0 2.25-.85 2.25-2.05 0-1.25-.78-2.05-2.25-2.05h-1.45Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  function socialLinks(p) {
    const L = p.links || {};
    const it = [];
    if (L.scholar) it.push(`<a href="${L.scholar}" target="_blank" rel="noopener noreferrer" aria-label="Google Scholar">${ICON.scholar}<span class="label">Google Scholar</span></a>`);
    if (L.github) it.push(`<a href="${L.github}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${ICON.github}<span class="label">GitHub</span></a>`);
    if (L.orcid) it.push(`<a href="${L.orcid}" target="_blank" rel="noopener noreferrer" aria-label="ORCID">${ICON.orcid}<span class="label">ORCID</span></a>`);
    return it.join("");
  }

  /* ---- theme ---------------------------------------------------------- */
  function initTheme() {
    const root = document.documentElement;
    const btn = $(".theme-toggle");
    if (!btn) return;
    const effective = () => root.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    btn.addEventListener("click", () => {
      const next = effective() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  function initNav() {
    const page = document.body.dataset.page;
    $$(".navlink").forEach((a) => { if (a.dataset.nav === page) a.setAttribute("aria-current", "page"); });
  }

  /* ---- per-publication BibTeX (event delegation) ---------------------- */
  function initPubDelegation() {
    document.addEventListener("click", (e) => {
      const bib = e.target.closest(".ab-btn[data-bib]");
      if (bib) {
        const box = bib.closest(".pub").querySelector(".bibtex");
        const opening = box.hasAttribute("hidden");
        box.toggleAttribute("hidden", !opening);
        bib.setAttribute("aria-expanded", String(opening));
        return;
      }
      const copy = e.target.closest(".bibtex .copy");
      if (copy && navigator.clipboard) {
        const code = copy.closest(".bibtex").querySelector("code");
        navigator.clipboard.writeText(code.textContent).then(() => {
          copy.textContent = "Copied";
          setTimeout(() => { copy.textContent = "Copy"; }, 1200);
        }).catch(() => {});
      }
    });
  }

  /* ---- command palette (⌘K) ------------------------------------------- */
  const PALETTE = { open: false, items: [], visible: [], sel: 0, prevFocus: null };

  function buildPaletteDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cmdk-overlay";
    wrap.id = "cmdk";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "Site search");
    wrap.innerHTML = `
      <div class="cmdk">
        <div class="cmdk-input-wrap">${ICON.search}
          <input class="cmdk-input" type="text" placeholder="Search publications, posts, pages…" aria-label="Search" autocomplete="off" spellcheck="false">
        </div>
        <div class="cmdk-results" id="cmdk-results" role="listbox"></div>
        <div class="cmdk-foot"><span><span class="kbd">↑↓</span> navigate</span><span><span class="kbd">⏎</span> open</span><span><span class="kbd">esc</span> close</span></div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => { if (e.target === wrap) closePalette(); });
    const input = $(".cmdk-input", wrap);
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", onPaletteKey);
    $("#cmdk-results", wrap).addEventListener("click", (e) => {
      const item = e.target.closest(".cmdk-item");
      if (item) activate(PALETTE.visible[+item.dataset.idx]);
    });
  }

  async function loadPaletteIndex() {
    try {
      const [pubs, posts] = await Promise.all([getJSON("data/publications.json"), getJSON("data/blog.json")]);
      const idx = [
        { type: "page", title: "About", sub: "Home", href: "./" },
        { type: "page", title: "Publications", sub: "All papers", href: "publications.html" },
        { type: "page", title: "Blog", sub: "Research notebook", href: "blog.html" },
      ];
      posts.forEach((p) => idx.push({ type: "post", title: p.title, sub: fmtDate(p.date), href: `post.html?slug=${encodeURIComponent(p.slug)}` }));
      pubs.forEach((p) => idx.push({
        type: "pub", title: p.title,
        sub: `${p.authors.replace(/[*†]/g, "")} · ${p.journal} ${p.year}`,
        href: p.url || (p.doi ? `https://doi.org/${p.doi}` : "#"), external: true,
      }));
      PALETTE.items = idx;
    } catch (e) { PALETTE.items = []; }
  }

  function hl(text, q) {
    const t = esc(text);
    if (!q) return t;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return t;
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  function render(query) {
    const q = (query || "").trim().toLowerCase();
    const m = (i) => !q || i.title.toLowerCase().includes(q) || (i.sub || "").toLowerCase().includes(q);
    const pages = PALETTE.items.filter((i) => i.type === "page" && m(i));
    const posts = PALETTE.items.filter((i) => i.type === "post" && m(i));
    let pubs = PALETTE.items.filter((i) => i.type === "pub" && m(i));
    if (!q) pubs = pubs.slice(0, 5);
    else pubs = pubs.slice(0, 14);

    PALETTE.visible = [];
    let html = "";
    const section = (label, arr) => {
      if (!arr.length) return;
      html += `<div class="cmdk-group">${label}</div>`;
      arr.forEach((i) => {
        const idx = PALETTE.visible.length;
        PALETTE.visible.push(i);
        html += `<div class="cmdk-item" role="option" data-idx="${idx}" aria-selected="${idx === 0}">
          <span class="t">${hl(i.title, q)}</span><span class="s">${esc(i.sub || "")}</span></div>`;
      });
    };
    section("Pages", pages);
    section("Posts", posts);
    section("Publications", pubs);
    const res = $("#cmdk-results");
    res.innerHTML = html || `<div class="cmdk-empty">No matches.</div>`;
    PALETTE.sel = 0;
    updateSel();
  }

  function updateSel() {
    $$("#cmdk-results .cmdk-item").forEach((el, i) => {
      const on = i === PALETTE.sel;
      el.setAttribute("aria-selected", String(on));
      if (on) el.scrollIntoView({ block: "nearest" });
    });
  }

  function onPaletteKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (PALETTE.visible.length) { PALETTE.sel = (PALETTE.sel + 1) % PALETTE.visible.length; updateSel(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (PALETTE.visible.length) { PALETTE.sel = (PALETTE.sel - 1 + PALETTE.visible.length) % PALETTE.visible.length; updateSel(); } }
    else if (e.key === "Enter") { e.preventDefault(); if (PALETTE.visible[PALETTE.sel]) activate(PALETTE.visible[PALETTE.sel]); }
    else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
  }

  function activate(item) {
    if (!item) return;
    closePalette();
    if (item.external) window.open(item.href, "_blank", "noopener");
    else window.location.href = item.href;
  }

  function openPalette() {
    const ov = $("#cmdk");
    if (!ov) return;
    PALETTE.prevFocus = document.activeElement;
    ov.classList.add("open");
    PALETTE.open = true;
    const input = $(".cmdk-input", ov);
    input.value = "";
    render("");
    input.focus();
  }
  function closePalette() {
    const ov = $("#cmdk");
    if (!ov) return;
    ov.classList.remove("open");
    PALETTE.open = false;
    if (PALETTE.prevFocus && PALETTE.prevFocus.focus) PALETTE.prevFocus.focus();
  }

  function initPalette() {
    buildPaletteDOM();
    loadPaletteIndex();
    const btn = $("#search-open");
    if (btn) btn.addEventListener("click", openPalette);
  }

  /* ---- home ----------------------------------------------------------- */
  async function initHome() {
    let profile, pubs, posts, news;
    try {
      [profile, pubs, posts, news] = await Promise.all([
        getJSON("data/profile.json"), getJSON("data/publications.json"), getJSON("data/blog.json"),
        getJSON("data/news.json"),
      ]);
    } catch (e) {
      const el = $("#bio");
      if (el) el.innerHTML = `<p class="muted">Could not load site data: ${esc(e.message)}</p>`;
      return;
    }

    document.title = `${profile.name} · ${profile.title}`;
    setText("#name", profile.name);
    const cn = $("#name-cn"); if (cn) cn.textContent = profile.nameCn || "";
    setText("#role", profile.title);
    setText("#affil", profile.affiliation + (profile.location ? " · " + profile.location : ""));
    setText("#tagline", profile.tagline || "");
    const social = $("#social"); if (social) social.innerHTML = socialLinks(profile);
    const contact = $("#contact");
    if (contact) contact.innerHTML = `${esc(profile.name)}${profile.nameCn ? " (" + esc(profile.nameCn) + ")" : ""}<br>` + (profile.emails || []).map((e) => `<a href="mailto:${e}">${esc(e)}</a>`).join("<br>");
    const bio = $("#bio"); if (bio) bio.innerHTML = profile.bio.map((p) => `<p>${p}</p>`).join("");

    const sel = $("#selected-pubs");
    if (sel) sel.innerHTML = pubs.filter((p) => p.highlight).sort((a, b) => b.year - a.year).slice(0, 5).map(pubHTML).join("");

    const latest = $("#latest-posts");
    if (latest) latest.innerHTML = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3).map(postRow).join("");
    const notebook = $("#notebook-section");
    if (notebook && !posts.length) notebook.style.display = "none";

    const newsEl = $("#news");
    if (newsEl) newsEl.innerHTML = news.slice(0, 5).map((n) => `<div class="news-item"><span class="date">${fmtDate(n.date)}</span><span class="body">${n.html}</span></div>`).join("");

  }

  function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }

  /* ---- publications page ---------------------------------------------- */
  async function initPublications() {
    const wrap = $("#pub-list"), tagbar = $("#tagbar");
    let pubs;
    try { pubs = await getJSON("data/publications.json"); }
    catch (e) { wrap.innerHTML = `<p class="muted">Could not load publications: ${esc(e.message)}</p>`; return; }

    const allTags = Array.from(new Set(pubs.flatMap((p) => p.tags || []))).sort();
    let active = null;

    function render() {
      const list = active ? pubs.filter((p) => (p.tags || []).includes(active)) : pubs;
      const byYear = {};
      list.forEach((p) => { (byYear[p.year] = byYear[p.year] || []).push(p); });
      const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
      wrap.innerHTML = years.map((y) => `<h2 class="year-head">${y}</h2>` + byYear[y].map(pubHTML).join("")).join("")
        || `<p class="muted">No publications match this tag.</p>`;
    }
    if (tagbar) {
      const mk = (label, val) => `<button class="tagbtn" type="button" data-tag="${esc(val)}" aria-pressed="${val === ""}">${esc(label)}</button>`;
      tagbar.innerHTML = mk("All", "") + allTags.map((t) => mk(t, t)).join("");
      tagbar.addEventListener("click", (e) => {
        const btn = e.target.closest(".tagbtn");
        if (!btn) return;
        active = btn.dataset.tag || null;
        $$(".tagbtn", tagbar).forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tag || "") === (active || ""))));
        render();
      });
    }
    render();
  }

  /* ---- blog index ----------------------------------------------------- */
  async function initBlog() {
    const wrap = $("#blog-list");
    let posts;
    try { posts = await getJSON("data/blog.json"); }
    catch (e) { wrap.innerHTML = `<p class="muted">Could not load posts: ${esc(e.message)}</p>`; return; }
    posts.sort((a, b) => (a.date < b.date ? 1 : -1));
    wrap.innerHTML = posts.length ? posts.map(postRow).join("") : `<p class="muted">No posts yet.</p>`;
  }

  /* ---- single post ---------------------------------------------------- */
  function buildTOC() {
    const heads = $$("#post-body h2, #post-body h3");
    if (heads.length < 3) return;
    heads.forEach((h, i) => { if (!h.id) h.id = `${slugify(h.textContent) || "sec"}-${i}`; });
    const items = heads.map((h) => `<li class="lvl-${h.tagName === "H3" ? 3 : 2}"><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join("");
    const toc = document.createElement("nav");
    toc.className = "toc";
    toc.setAttribute("aria-label", "Table of contents");
    toc.innerHTML = `<p class="toc-label">Contents</p><ul>${items}</ul>`;
    const body = $("#post-body");
    body.insertBefore(toc, body.firstChild);
  }

  async function initPost() {
    const wrap = $("#post-body"), headerEl = $("#post-header");
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      headerEl.innerHTML = `<h1>Post not found</h1>`;
      wrap.innerHTML = `<p class="muted">No such post. <a href="blog.html">Back to the blog →</a></p>`;
      return;
    }
    let posts, md;
    try { posts = await getJSON("data/blog.json"); md = await getText(`blog/${slug}/index.md`); }
    catch (e) {
      headerEl.innerHTML = `<h1>Post not found</h1>`;
      wrap.innerHTML = `<p class="muted">Could not load this post. <a href="blog.html">Back to the blog →</a></p>`;
      return;
    }
    const meta = posts.find((p) => p.slug === slug) || { title: slug, date: "", tags: [] };
    document.title = `${meta.title} · Yue Li`;
    const tags = (meta.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    headerEl.innerHTML = `
      <a class="back-link" href="blog.html"><svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true"><path d="M19 12H5m6 6-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> all posts</a>
      <h1>${esc(meta.title)}</h1>
      <div class="meta"><span>${fmtDate(meta.date)}</span><span class="tags">${tags}</span></div>`;

    if (window.marked) { marked.setOptions({ gfm: true, breaks: false }); wrap.innerHTML = marked.parse(md); }
    else { wrap.textContent = md; }

    $$("#post-body img").forEach((img) => {
      const s = img.getAttribute("src") || "";
      if (s && !/^(https?:|\/|data:)/i.test(s)) img.setAttribute("src", `blog/${slug}/${s}`);
      img.loading = "lazy";
    });
    $$("#post-body a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    if (window.hljs) $$("#post-body pre code").forEach((b) => { try { hljs.highlightElement(b); } catch (e) {} });
    if (window.renderMathInElement) renderMathInElement(wrap, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }], throwOnError: false });
    buildTOC();
  }

  /* ---- boot ----------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNav();
    initPubDelegation();
    initPalette();
    const page = document.body.dataset.page;
    if (page === "home") initHome();
    else if (page === "publications") initPublications();
    else if (page === "blog") initBlog();
    else if (page === "post") initPost();
  });
})();
