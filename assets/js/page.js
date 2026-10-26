/* =========================================================
   Chirayu Medical College & Hospital — inner pages
   One template (page.html) for every page. The URL /<slug>/ picks the
   content: Supabase site_content['page:<slug>'] → content/pages/<slug>.json.
   A slug can have folders (events/academics/cme-09-07-2022).
   Pages not built yet show a friendly "being updated" notice.
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CFG = window.CMCH_CONFIG || {};
  var lenis = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }

  /* ---------------- Which page? ---------------- */
  var params = new URLSearchParams(location.search);
  function cleanSlug(v) {
    return String(v || '').replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/\/index$/, '')
      .split('/').filter(function (x) { return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(x); }).join('/');
  }
  var slug = cleanSlug(params.get('p') || location.pathname);
  if (slug === 'page') slug = cleanSlug(params.get('p'));
  function slugFile(s) { return s.split('/').map(encodeURIComponent).join('/'); }
  var isPreview = params.get('preview') === 'draft';

  /* ---------------- Supabase / file loading ---------------- */
  function sbGet(query) {
    if (!(CFG.supabaseUrl && CFG.supabaseAnonKey)) return Promise.reject(new Error('Supabase not configured'));
    return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/site_content?' + query, { headers: { apikey: CFG.supabaseAnonKey } })
      .then(function (r) { if (!r.ok) throw new Error('Supabase ' + r.status); return r.json(); });
  }
  function fileGet(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function loadPage() {
    if (!slug) return Promise.resolve(null);
    if (isPreview) {
      try {
        var d = localStorage.getItem('cmch_admin_draft_page:' + slug);
        if (d) return Promise.resolve(JSON.parse(d));
      } catch (e) { /* fall through */ }
    }
    return sbGet('key=eq.' + encodeURIComponent('page:' + slug) + '&select=data')
      .then(function (rows) { if (!rows[0]) throw new Error('no row'); return rows[0].data; })
      .catch(function () { return fileGet('/content/pages/' + slugFile(slug) + '.json'); })
      .catch(function () { return null; });
  }
  /* Site-wide settings (design, switcher, visitor count, menu, footer, contact) live on the homepage record */
  function loadSettings() {
    if (isPreview) {
      try { var hd = localStorage.getItem('cmch_admin_draft_home'); if (hd) return Promise.resolve(JSON.parse(hd)); } catch (e) { /* fall through */ }
    }
    return sbGet('key=eq.home&select=theme:data->>theme,themeSwitcher:data->themeSwitcher,visitorBase:data->visitorBase,menu:data->menu,footerCols:data->footerCols,contact:data->contact')
      .then(function (rows) { if (!rows[0]) throw new Error('no row'); return rows[0]; })
      .catch(function () { return fileGet('/content/home.json'); })
      .catch(function () { return {}; });
  }

  /* ---------------- Tiny safe formatter for cell / text content ----------------
     Supports: line breaks, "- " bullet lines, **bold**, [text](url), ![alt](image-url) */
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(javascript|data|vbscript):/i.test(u)) return '#';
    return u;
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      return '<img class="rt-img" src="' + safeUrl(src.trim()).replace(/ /g, '%20') + '" alt="' + alt + '" loading="lazy">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, href) {
      var u = safeUrl(href.trim()).replace(/ /g, '%20'), pdf = /\.pdf(\?|#|$)/i.test(u);
      return '<a class="rt-link' + (pdf ? ' rt-link--pdf' : '') + '" href="' + u + '" target="_blank" rel="noopener">' + t + (pdf ? ' <span class="rt-badge">PDF</span>' : '') + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return s;
  }
  function rich(text) {
    var lines = String(text || '').split('\n'), html = '', list = null, para = [];
    function flushPara() { if (para.length) { html += '<p>' + para.join('<br>') + '</p>'; para = []; } }
    function flushList() { if (list) { html += '<ul>' + list.join('') + '</ul>'; list = null; } }
    lines.forEach(function (l) {
      var t = l.trim();
      if (!t) { flushPara(); flushList(); return; }
      var m = t.match(/^[-•]\s+(.*)$/);
      if (m) { flushPara(); (list = list || []).push('<li>' + inline(m[1]) + '</li>'); return; }
      flushList();
      para.push(inline(t));
    });
    flushPara(); flushList();
    return html;
  }
  function plain(text) { return String(text || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, ''); }

  /* ---------------- Rendering ---------------- */
  function titleFromSlug(s) {
    return String(s).split('/').pop().replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function blockId(b, i) { return 'b-' + String(b.id || b.title || i).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'b-' + i; }

  function renderHero(p) {
    var banner = p.banner ? ' style="--banner:url(\'' + esc(p.banner) + '\')"' : '';
    return '<section class="phero' + (p.banner ? ' phero--banner' : '') + '"' + banner + '>' +
      '<div class="phero__deco" aria-hidden="true"><svg viewBox="0 0 1600 120" preserveAspectRatio="none"><path d="M0 80H560l14-12 14 12h20l12 18 18-70 20 82 12-30h46l22-16 22 16H1600"/></svg></div>' +
      '<div class="wrap">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a>' + icon('right') + (p.kicker ? '<span>' + esc(p.kicker) + '</span>' + icon('right') : '') + '<b aria-current="page">' + esc(p.title) + '</b></nav>' +
      '<h1 class="phero__title" data-split>' + esc(p.title) + '</h1>' +
      (p.intro ? '<p class="phero__intro" data-in style="--d:3">' + esc(p.intro) + '</p>' : '') +
      ((p.updated || p.updatedBy) ? '<div class="phero__meta" data-in style="--d:4">' +
        (p.updated ? '<span>' + icon('file') + ' Last updated on <b>' + esc(p.updated) + '</b></span>' : '') +
        (p.updatedBy ? '<span>by <b>' + esc(p.updatedBy) + '</b></span>' : '') + '</div>' : '') +
      '</div></section>';
  }

  function searchBox(label) {
    return '<label class="psearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" placeholder="' + esc(label) + '" aria-label="' + esc(label) + '"></label>';
  }

  var RENDER = {
    table: function (b) {
      var cols = b.columns && b.columns.length ? b.columns : ['', ''];
      var rows = b.rows || [];
      return '<div class="pblock__bar">' + (rows.length > 8 ? searchBox('Search in this table') : '') + '<span class="pcount">' + rows.length + ' entries</span></div>' +
        '<div class="ptable-wrap"><table class="ptable"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) {
          var cells = (r && r.cells) || [];
          return '<tr data-reveal>' + cols.map(function (c, k) {
            return (k === 0 ? '<th scope="row"' : '<td') + ' data-label="' + esc(c) + '">' + rich(cells[k]) + (k === 0 ? '</th>' : '</td>');
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>' +
        '<p class="pempty" hidden>No matching entries.</p></div>';
    },
    files: function (b) {
      var items = b.items || [], LIMIT = 12;
      return '<div class="pblock__bar">' + (items.length > 6 ? searchBox('Search documents') : '') + '<span class="pcount">' + items.length + ' documents</span></div>' +
        '<div class="pfiles">' + items.map(function (it, i) {
          var u = safeUrl(it.href), ext = ((u.match(/\.([a-z0-9]{2,4})(?:\?|#|$)/i) || [, 'link'])[1]).toUpperCase();
          return '<a class="pfile' + (i >= LIMIT ? ' is-more' : '') + '" href="' + esc(u) + '" target="_blank" rel="noopener" data-cursor="Open">' +
            '<span class="pfile__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg><i>' + esc(ext.slice(0, 4)) + '</i></span>' +
            '<span class="pfile__t">' + esc(it.title) + (it.date ? '<small>' + esc(it.date) + '</small>' : '') + '</span>' +
            '<span class="pfile__dl" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg></span></a>';
        }).join('') + '</div>' +
        '<p class="pempty" hidden>No matching documents.</p>' +
        (items.length > LIMIT ? '<button type="button" class="btn btn--ghost pmore" data-more>Show all ' + items.length + ' documents</button>' : '');
    },
    gallery: function (b) {
      var items = b.items || [];
      return '<div class="pgallery">' + items.map(function (it, i) {
        return '<button type="button" class="pgal" data-lb="' + i + '" data-cursor="View" data-reveal><img src="' + esc(it.img) + '" alt="' + esc(it.caption || '') + '" loading="lazy">' +
          (it.caption ? '<span class="pgal__cap">' + esc(it.caption) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    },
    text: function (b) { return '<div class="ptext">' + rich(b.body) + '</div>'; },
    button: function (b) {
      return '<a class="pcta" href="' + esc(safeUrl(b.href)) + '" target="_blank" rel="noopener" data-reveal><span class="pcta__ic">' + icon('file') + '</span>' +
        '<span class="pcta__t"><b>' + esc(b.label || b.title) + '</b>' + (b.note ? '<small>' + esc(b.note) + '</small>' : '') + '</span><span class="pcta__go">' + icon('arrow') + '</span></a>';
    }
  };

  function renderBlocks(p) {
    var blocks = (p.blocks || []).filter(function (b) { return RENDER[b.type]; });
    if (!blocks.length) {
      return '<section class="pbody"><div class="wrap"><div class="pnotice" data-reveal>' +
        '<span class="pnotice__ic">' + icon('bell') + '</span><div><h2>Content is being updated</h2><p>This page will be filled from the admin panel soon.</p></div></div></div></section>';
    }
    var toc = blocks.length > 1 ? '<aside class="toc" aria-label="On this page"><div class="toc__in"><b>On this page</b>' +
      blocks.map(function (b, i) { return '<a href="#' + blockId(b, i) + '">' + esc(b.title || b.label || 'Section ' + (i + 1)) + '</a>'; }).join('') + '</div></aside>' : '';
    return '<section class="pbody"><div class="wrap pbody__grid' + (toc ? '' : ' pbody__grid--single') + '">' + toc + '<div class="pbody__main">' +
      blocks.map(function (b, i) {
        var showTitle = b.type !== 'button' && b.title;
        return '<section class="pblock pblock--' + b.type + '" id="' + blockId(b, i) + '" data-block="' + i + '">' +
          (showTitle ? '<div class="head"><div><div class="kick"><svg><use href="#i-ecg"/></svg> ' + esc(i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</div><h2 class="head__title pblock__title" data-split>' + esc(b.title) + '</h2></div></div>' : '') +
          RENDER[b.type](b) + '</section>';
      }).join('') + '</div></div></section>';
  }

  function renderMissing() {
    var t = titleFromSlug(slug || 'Page');
    document.title = t + ' | Chirayu Medical College & Hospital';
    var robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex';
    document.head.appendChild(robots);
    return renderHero({ title: t, intro: 'This page is being updated on our new website.' }) +
      '<section class="pbody"><div class="wrap"><div class="pnotice" data-reveal><span class="pnotice__ic">' + icon('bell') + '</span><div>' +
      '<h2>Coming soon</h2><p>We are moving this information to the new website. For anything urgent, please call or write to us.</p>' +
      '<div class="pnotice__btns"><a class="btn" data-c-dial href="tel:07552709101">' + icon('phone') + ' Call the college</a>' +
      '<a class="btn btn--ghost" href="/contact/">Contact details</a>' +
      '<a class="btn btn--ghost" href="/">Back to Home</a></div></div></div></div></section>';
  }

  function render(p) {
    var root = $('[data-page-root]');
    if (!p) { root.innerHTML = renderMissing(); return; }
    document.title = (p.title || titleFromSlug(slug)) + ' | Chirayu Medical College & Hospital';
    var md = $('meta[name="description"]');
    if (md && p.intro) md.setAttribute('content', p.intro);
    root.innerHTML = renderHero(p) + renderBlocks(p) + cta();
    if (isPreview) {
      var b = document.createElement('a');
      b.className = 'preview-badge'; b.href = location.pathname + (params.get('p') ? '?p=' + encodeURIComponent(slug) : '');
      b.innerHTML = '<span class="emerg-dot"></span> Draft preview (not published) <u>Exit</u>';
      document.body.appendChild(b);
    }
    wireBlocks(p);
  }
  function cta() {
    return '<section class="section section--cta"><div class="wrap"><div class="cta" data-reveal>' +
      '<svg class="cta__deco" viewBox="0 0 600 200" fill="none" stroke="#fff" stroke-width="4" aria-hidden="true"><path d="M0 120h180l14-14 14 14h20l12 20 18-110 20 130 12-40h40l22-18 22 18h226"/></svg>' +
      '<div><h2 data-split>Hospital Enquiry</h2><address><b>Chirayu Medical College &amp; Hospital</b>Bhainsakhedi, Near Bairagarh (Bhopal-Indore Highway), Bhopal, M.P. – 462030</address></div>' +
      '<div class="cta__actions"><a class="cta__phone" href="tel:07552709101">' + icon('phone') + ' 0755 2709101/102/103</a>' +
      '<div class="cta__btns"><a class="btn btn--light" href="/hospital-enquiry/">Hospital Enquiry ' + icon('arrow') + '</a><a class="btn btn--outline-light" href="/location-map/">' + icon('pin') + ' Location Map</a></div></div>' +
      '</div></div></section>';
  }

  /* search, show-more, lightbox */
  function wireBlocks(p) {
    $$('.pblock').forEach(function (sec) {
      var input = $('.psearch input', sec), more = $('[data-more]', sec), count = $('.pcount', sec), empty = $('.pempty', sec);
      var rows = $$('.ptable tbody tr, .pfile', sec), total = rows.length, unit = sec.classList.contains('pblock--files') ? 'documents' : 'entries';
      if (input) {
        input.addEventListener('input', function () {
          var q = input.value.trim().toLowerCase(), shown = 0;
          if (q && more) { more.hidden = true; sec.classList.add('is-expanded'); }
          rows.forEach(function (r) {
            var hit = !q || r.textContent.toLowerCase().indexOf(q) > -1;
            r.hidden = !hit; if (hit) shown++;
            if (hit) r.classList.add('is-visible');
          });
          count.textContent = q ? shown + ' of ' + total + ' ' + unit : total + ' ' + unit;
          if (empty) empty.hidden = shown > 0;
        });
      }
      if (more) more.addEventListener('click', function () { sec.classList.add('is-expanded'); more.hidden = true; });
    });

    // lightbox for galleries
    var box = $('.lbox'), img = $('img', box), cap = $('figcaption', box), list = [], at = 0;
    function show(i) { at = (i + list.length) % list.length; img.src = list[at].img; img.alt = list[at].caption || ''; cap.textContent = list[at].caption || ''; }
    function open(items, i) { list = items; show(i); box.hidden = false; lockScroll(true); requestAnimationFrame(function () { box.classList.add('is-open'); }); $('.lbox__close', box).focus(); }
    function close() { box.classList.remove('is-open'); lockScroll(false); setTimeout(function () { box.hidden = true; }, 300); }
    $$('.pblock--gallery').forEach(function (sec) {
      var items = (p.blocks[+sec.dataset.block] || {}).items || [];
      $$('[data-lb]', sec).forEach(function (b) { b.addEventListener('click', function () { open(items, +b.dataset.lb); }); });
    });
    $('.lbox__close', box).addEventListener('click', close);
    $('.lbox__nav--prev', box).addEventListener('click', function () { show(at - 1); });
    $('.lbox__nav--next', box).addEventListener('click', function () { show(at + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });

    // table of contents: highlight the section in view
    var links = $$('.toc a');
    if (links.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      $$('.pblock').forEach(function (s) { io.observe(s); });
    }
  }

  /* =========================================================
     Shared site behaviour (same as the homepage)
     ========================================================= */
  var THEMES = ['cinema', 'classic', 'clean', 'bold'];
  var THEME_COLORS = { classic: '#0A8E97', cinema: '#06161C', clean: '#0A8E97', bold: '#FFC94A' };
  var themeUser = null;
  try { themeUser = localStorage.getItem('cmch_theme'); } catch (e) { /* blocked */ }
  if (THEMES.indexOf(themeUser) < 0) themeUser = null;
  function currentTheme() { return document.documentElement.getAttribute('data-theme'); }
  function syncSwitch() {
    var t = currentTheme(), ink = $('.theme-switch__ink');
    $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.themeSet === t ? 'true' : 'false'); });
    var on = $('[data-theme-set="' + t + '"]');
    if (on && ink && on.offsetWidth) { ink.style.width = on.offsetWidth + 'px'; ink.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[t]);
    syncSwitch();
  }
  function setTheme(t, x, y) {
    if (THEMES.indexOf(t) < 0 || t === currentTheme()) return;
    themeUser = t;
    try { localStorage.setItem('cmch_theme', t); } catch (e) { /* ignore */ }
    if (!document.startViewTransition || reduce) { applyTheme(t); return; }
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(function () { applyTheme(t); });
    vt.ready.then(function () {
      document.documentElement.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 800, easing: 'cubic-bezier(.22,.8,.24,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () { /* skipped */ });
  }
  function initThemeSwitch() {
    var btns = $$('[data-theme-set]');
    btns.forEach(function (b, k) {
      b.addEventListener('click', function (e) {
        var r = b.getBoundingClientRect();
        setTheme(b.dataset.themeSet, e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = btns[(k + d + btns.length) % btns.length]; n.focus(); n.click();
      });
    });
    syncSwitch();
    if (document.fonts) document.fonts.ready.then(syncSwitch);
    window.addEventListener('resize', syncSwitch);
  }
  function applySettings(c) {
    var def = THEMES.indexOf(c.theme) > -1 ? c.theme : null;
    if (c.themeSwitcher === false || c.themeSwitcher === 'false') {
      document.documentElement.classList.add('no-switch');
      if (def && def !== currentTheme()) applyTheme(def);
    } else if (def && !themeUser && def !== currentTheme()) applyTheme(def);
    visitors(parseInt(c.visitorBase, 10) || 0);
    if (window.CMCHChrome) window.CMCHChrome.apply(c);
  }

  function lockScroll(on) {
    document.body.classList.toggle('no-scroll', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  function initDrawer() {
    var burger = $('.burger'), drawer = $('#drawer'), scrim = $('.drawer-scrim');
    if (!burger || !drawer) return;
    function set(open) { drawer.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open); lockScroll(open); }
    burger.addEventListener('click', function () { set(!drawer.classList.contains('is-open')); });
    scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080 && drawer.classList.contains('is-open')) set(false); });
    $$('.drawer details, .drawer > a').forEach(function (el, k) { el.style.setProperty('--n', k); });
    $$('.drop').forEach(function (d) { $$('a, .drop__head', d).forEach(function (a, k) { a.style.setProperty('--n', k); }); });
  }

  function initScroll() {
    var header = $('.header'), prog = $('.progress'), top = $('.to-top'), circle = top && $('circle', top);
    var ticking = false, anchorY = 0, hidden = false;
    function update() {
      ticking = false;
      var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, y / max) : 0;
      if (y < 300 || document.body.classList.contains('no-scroll')) { hidden = false; anchorY = y; }
      else if (!hidden && y - anchorY > 120) { hidden = true; anchorY = y; }
      else if (hidden && anchorY - y > 60) { hidden = false; anchorY = y; }
      else if ((hidden && y > anchorY) || (!hidden && y < anchorY)) anchorY = y;
      header.classList.toggle('is-stuck', y > 40);
      header.classList.toggle('is-hidden', hidden);
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (top) { top.classList.toggle('is-shown', y > 600); circle.style.setProperty('--off', (151 - 151 * p).toFixed(1)); }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    if (top) top.addEventListener('click', function () { if (lenis) lenis.scrollTo(0, { duration: 1.2 }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    update();
  }

  function initLenis() {
    if (reduce || !finePointer || typeof window.Lenis !== 'function') return;
    try {
      lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false,
        prevent: function (node) { return !!(node.closest && node.closest('.drawer, .ptable-wrap, [data-lenis-prevent]')); } });
      document.documentElement.classList.add('smooth-scroll');
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    } catch (e) { lenis = null; }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -90 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  function splitWords(text) {
    var n = 0;
    return String(text).split(/\s+/).filter(Boolean).map(function (w) { return '<span class="w"><span style="--i:' + (n++) + '">' + esc(w) + '</span></span>'; }).join(' ');
  }
  function initReveal() {
    $$('[data-split]').forEach(function (el) {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = 1;
      el.setAttribute('aria-label', el.textContent.trim());
      el.innerHTML = '<span aria-hidden="true">' + splitWords(el.textContent.trim()) + '</span>';
      el.classList.add('split');
    });
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' }) : null;
    var groups = new Map();
    $$('[data-reveal]').forEach(function (el) {
      var k = groups.get(el.parentElement) || 0;
      el.style.setProperty('--rd', Math.min(k, 8) * 0.05 + 's');
      groups.set(el.parentElement, k + 1);
    });
    $$('[data-reveal], .split, .head, .footer, .cta').forEach(function (el) { if (io) io.observe(el); else el.classList.add('is-visible'); });
  }

  function initPointerFx() {
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (!b || reduce) return;
      var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
      rp.className = 'ripple';
      rp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      b.appendChild(rp); setTimeout(function () { rp.remove(); }, 700);
    });
    if (!finePointer || reduce) return;
    document.addEventListener('mousemove', function (e) {
      var t = e.target.closest && e.target.closest('.btn, .pfile, .pcta');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
      t.style.setProperty('--sx', (e.clientX - r.left) + 'px'); t.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    }, { passive: true });
    var cur = $('.cursor');
    if (!cur) return;
    var ring = $('.cursor__ring', cur), dot = $('.cursor__dot', cur), label = $('.cursor__label', cur), mx = -100, my = -100, rx = -100, ry = -100, shown = false;
    document.documentElement.classList.add('has-cursor');
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      if (!shown) { shown = true; rx = mx; ry = my; cur.classList.add('is-on'); }
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, summary, input, select, textarea');
      var txt = t && t.dataset && t.dataset.cursor ? t.dataset.cursor : '';
      cur.classList.toggle('is-hover', !!t && !txt);
      cur.classList.toggle('is-label', !!txt);
      if (txt && label.textContent !== txt) label.textContent = txt;
      cur.classList.toggle('is-dark', !!(e.target.closest && e.target.closest('.footer, .cta, .topbar, .pgal')));
    }, { passive: true });
    document.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); shown = false; });
    (function loop() { rx += (mx - rx) * .18; ry += (my - ry) * .18; ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)'; requestAnimationFrame(loop); })();
  }

  function visitors(base) {
    var el = $('[data-visitors]');
    if (!el || el.dataset.done) return;
    el.dataset.done = 1;
    var extra = 0;
    try {
      extra = parseInt(localStorage.getItem('cmch_visits') || '0', 10);
      if (!sessionStorage.getItem('cmch_counted')) { extra += 1; localStorage.setItem('cmch_visits', extra); sessionStorage.setItem('cmch_counted', '1'); }
    } catch (e) { /* blocked */ }
    var str = String(base + extra), html = '';
    for (var i = 0; i < str.length; i++) {
      if (i && (str.length - i) % 3 === 0) html += '<span class="sep">,</span>';
      html += '<span class="d"><span class="s" style="transform:translateY(-' + (+str[i] * 38) + 'px)">' + '0123456789'.split('').map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</span></span>';
    }
    el.innerHTML = html;
    el.setAttribute('aria-label', 'Visitor counter: ' + str);
  }

  function lazyScript(src, target) {
    var done = false;
    function load() { if (done) return; done = true; var s = document.createElement('script'); s.src = src; s.async = true; document.body.appendChild(s); }
    if (!target || !('IntersectionObserver' in window)) { setTimeout(load, 2500); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(target);
  }
  window.googleTranslateElementInit = function () {
    if (window.google && google.translate) new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,hi', layout: google.translate.TranslateElement.InlineLayout.SIMPLE }, 'google_translate_element');
  };

  /* ---------------- Boot ---------------- */
  initThemeSwitch();
  initDrawer();
  initScroll();
  initLenis();
  initPointerFx();
  loadSettings().then(applySettings);
  loadPage().then(function (p) {
    render(p);
    initReveal();
    document.body.classList.add('is-loaded');
    if (location.hash) { var t = document.querySelector(location.hash); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
  });
  lazyScript('https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit', $('#google_translate_element'));
})();
