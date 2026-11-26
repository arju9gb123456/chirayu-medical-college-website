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
  function linkKind(u) {
    if (/\.pdf(\?|#|$)/i.test(u)) return { k: 'pdf', label: 'PDF document', ic: 'file', cta: 'View PDF', ext: true };
    if (/^tel:/i.test(u)) return { k: 'page', label: 'Phone', ic: 'phone', cta: 'Call', ext: false };
    if (/^https?:/i.test(u)) return { k: 'ext', label: /cmchbhopal\.com/i.test(u) ? 'Website page' : 'External link', ic: 'link', cta: 'Open', ext: true };
    return { k: 'page', label: 'Page', ic: 'college', cta: 'Open page', ext: false };
  }
  function niceDate(d) {
    var m = String(d).match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/), mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m && +m[2] >= 1 && +m[2] <= 12 ? (+m[1]) + ' ' + mo[+m[2] - 1] + ' ' + m[3] : d;
  }
  function catIcon(c) {
    c = String(c).toLowerCase();
    if (/staff|faculty|leader|dean|management/.test(c)) return 'college';
    if (/student|universit|admission|exam|fee/.test(c)) return 'cap';
    if (/ragging|safety|committee|harass/.test(c)) return 'shield';
    if (/research|award|cme|academic/.test(c)) return 'award';
    if (/hostel/.test(c)) return 'college';
    if (/hospital|clinical|bed|patient|birth|death|record/.test(c)) return 'bed';
    if (/grievance/.test(c)) return 'bell';
    if (/college|institution/.test(c)) return 'college';
    return 'file';
  }
  function initials(n) {
    return String(n || '').replace(/^(dr|prof|mr|mrs|ms|shri|col)\.?\s+/i, '').replace(/^(\(dr\.?\)|dr\.?)\s*/i, '').split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
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
      stats(p) +
      ((p.updated || p.updatedBy) ? '<div class="phero__meta" data-in style="--d:4">' +
        (p.updated ? '<span>' + icon('file') + ' Last updated on <b>' + esc(p.updated) + '</b></span>' : '') +
        (p.updatedBy ? '<span>by <b>' + esc(p.updatedBy) + '</b></span>' : '') + '</div>' : '') +
      '</div></section>';
  }

  /* Faculty pages: total + count per group, worked out from the blocks */
  function stats(p) {
    var db = (p.blocks || []).filter(function (b) { return b.type === 'disclosures'; })[0];
    if (db) {
      var it = db.items || [], pdf = it.filter(function (x) { return linkKind(safeUrl(x.href)).k === 'pdf'; }).length, cats = {};
      it.forEach(function (x) { cats[x.category || 'General'] = 1; });
      return '<div class="phero__stats" data-in style="--d:3"><div><b>' + it.length + '</b><span>Disclosures</span></div><div><b>' + Object.keys(cats).length + '</b><span>Categories</span></div>' +
        '<div><b>' + pdf + '</b><span>PDF documents</span></div><div><b>' + (it.length - pdf) + '</b><span>Linked pages</span></div></div>';
    }
    var fb = (p.blocks || []).filter(function (b) { return b.type === 'faculty' && (b.items || []).length; });
    if (!fb.length) return '';
    var tot = fb.reduce(function (a, b) { return a + b.items.length; }, 0);
    return '<div class="phero__stats" data-in style="--d:3"><div><b>' + tot + '</b><span>Faculty members</span></div>' +
      fb.slice(0, 5).map(function (b) { return '<div><b>' + b.items.length + '</b><span>' + esc(b.title || '') + '</span></div>'; }).join('') + '</div>';
  }
  function searchBox(label) {
    return '<label class="psearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" placeholder="' + esc(label) + '" aria-label="' + esc(label) + '"></label>';
  }

  var RENDER = {
    table: function (b) {
      var cols = b.columns && b.columns.length ? b.columns : ['', ''];
      var rows = b.rows || [], big = rows.length > 40, wide = cols.length > 6;
      // short columns (Sr. No., View, dates) stay narrow so the text column gets the room
      var narrow = cols.map(function (c, k) {
        return String(c).length <= 16 && rows.every(function (r) { return plain(((r && r.cells) || [])[k]).length <= 16; });
      });
      if (narrow.every(Boolean)) narrow = narrow.map(function () { return false; });
      function cls(k) { return narrow[k] ? ' class="c-narrow"' : ''; }
      var fc = b.filterCol === '' || b.filterCol == null ? -1 : +b.filterCol, opts = [];
      if (fc > -1) rows.forEach(function (r) { var v = plain(((r && r.cells) || [])[fc]).trim(); if (v && opts.indexOf(v) < 0) opts.push(v); });
      return '<div class="pblock__bar ptbar">' + (rows.length > 8 ? searchBox('Search in this table') : '') +
        (opts.length > 1 ? '<label class="pfilter"><span>' + esc(cols[fc]) + '</span><select data-filter><option value="">All (' + opts.length + ')</option>' +
          opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>' : '') +
        (wide ? '<span class="pscroll-hint">' + icon('arrow') + ' Scroll sideways</span>' : '') +
        '<span class="pcount">' + rows.length + ' entries</span></div>' +
        '<div class="ptable-wrap' + (wide ? ' ptable-wrap--wide' : '') + '"' + (wide ? ' data-lenis-prevent' : '') + '><table class="ptable' + (wide ? ' ptable--wide' : '') + '"' + (wide ? ' style="--cols:' + cols.length + '"' : '') + '><thead><tr>' +
        cols.map(function (c, k) { return '<th scope="col"' + cls(k) + '><button type="button" class="psort" data-sort="' + k + '">' + esc(c) + '<i aria-hidden="true"></i></button></th>'; }).join('') + '</tr></thead><tbody data-narrow="' + narrow.map(function (n) { return n ? 1 : 0; }).join('') + '"></tbody></table>' +
        '<p class="pempty" hidden>No matching entries.</p></div>' +
        (big ? '<div class="pmore-bar"><button type="button" class="btn btn--ghost" data-more-rows>Show 25 more</button><button type="button" class="btn btn--ghost" data-all-rows>Show all</button></div>' : '') +
        '';
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
    /* Faculty: photo cards; tap / hover shows AEBAS ID, registration, employment */
    faculty: function (b) {
      var items = b.items || [];
      var tcols = ['Name', 'Designation', 'Qualification', 'Experience', 'AEBAS ID', 'Med. Reg. No.', 'Employment'];
      var table = '<div class="ptable-wrap ptable-wrap--wide pfac-table" data-lenis-prevent><table class="ptable ptable--wide" style="--cols:7"><thead><tr>' +
        tcols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        items.map(function (f) {
          var v = [f.name, f.designation, f.qualification, f.experience, f.aebas, f.regNo, f.employment];
          return '<tr class="fac-row">' + v.map(function (x, k) { return (k ? '<td' : '<th scope="row"') + ' data-label="' + esc(tcols[k]) + '">' + esc(x || '—') + (k ? '</td>' : '</th>'); }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
      return '<div class="pblock__bar">' + (items.length > 8 ? searchBox('Search by name, qualification…') : '') +
        '<div class="pview" role="group" aria-label="View"><button type="button" class="is-on" data-view="cards">Cards</button><button type="button" data-view="table">Table</button></div>' +
        '<span class="pcount">' + items.length + (items.length === 1 ? ' member' : ' members') + '</span></div>' + table +
        '<div class="pfac">' + items.map(function (f) {
          var rows = [['Designation', f.designation], ['Qualification', f.qualification], ['Experience', f.experience], ['AEBAS ID', f.aebas], ['Med. Reg. No.', f.regNo], ['Employment', f.employment]]
            .filter(function (r) { return r[1]; });
          return '<article class="fac" tabindex="0" data-reveal data-cursor="Details">' +
            '<div class="fac__photo">' + (f.photo ? '<img src="' + esc(f.photo) + '" alt="' + esc(f.name) + '" loading="lazy" decoding="async">' : '<span class="fac__ph">' + esc(initials(f.name)) + '</span>') +
            (f.designation ? '<span class="fac__badge">' + esc(f.designation) + '</span>' : '') + '</div>' +
            '<div class="fac__body"><h3>' + esc(f.name) + '</h3>' + (f.qualification ? '<p>' + esc(f.qualification) + '</p>' : '') +
            (f.experience ? '<span class="fac__exp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' + esc(f.experience) + '</span>' : '') + '</div>' +
            '<div class="fac__more" aria-hidden="true"><b>' + esc(f.name) + '</b><dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl></div>' +
            '</article>';
        }).join('') + '</div><p class="pempty" hidden>No matching faculty.</p>';
    },
    /* Disclosures: NMC / MSR list — grouped by category, filter chips, search */
    disclosures: function (b) {
      var items = b.items || [], cats = [];
      items.forEach(function (it) { var c = it.category || 'General'; if (cats.indexOf(c) < 0) cats.push(c); });
      var n = 0;
      return '<div class="dsc">' +
        '<div class="dsc__bar"><div class="dsc__chips" role="tablist" aria-label="Filter">' +
          '<button type="button" class="dsc__chip is-on" data-cat="">All <i>' + items.length + '</i></button>' +
          cats.map(function (c) { return '<button type="button" class="dsc__chip" data-cat="' + esc(c) + '">' + esc(c) + ' <i>' + items.filter(function (it) { return (it.category || 'General') === c; }).length + '</i></button>'; }).join('') +
        '</div>' + searchBox('Search disclosures…') + '</div>' +
        cats.map(function (c) {
          var list = items.filter(function (it) { return (it.category || 'General') === c; });
          return '<section class="dsc__group" data-group="' + esc(c) + '"><header class="dsc__gh" data-reveal><span class="dsc__gic">' + icon(catIcon(c)) + '</span><h3>' + esc(c) + '</h3><span class="dsc__gn">' + list.length + (list.length === 1 ? ' item' : ' items') + '</span></header>' +
            '<div class="dsc__list">' + list.map(function (it) {
              n++;
              var u = safeUrl(it.href), kind = linkKind(u);
              return '<a class="dsc__item" href="' + esc(u) + '"' + (kind.ext ? ' target="_blank" rel="noopener"' : '') + ' data-reveal data-cursor="Open">' +
                '<span class="dsc__no">' + (it.no || (n < 10 ? '0' + n : n)) + '</span>' +
                '<span class="dsc__body"><b>' + esc(it.title) + '</b><span class="dsc__meta">' +
                  '<span class="dsc__tag dsc__tag--' + kind.k + '">' + icon(kind.ic) + kind.label + '</span>' +
                  (it.updated ? '<span class="dsc__date">' + icon('bell') + 'Updated ' + esc(niceDate(it.updated)) + '</span>' : '') +
                '</span></span>' +
                '<span class="dsc__go"><span>' + kind.cta + '</span>' + icon('arrow') + '</span></a>';
            }).join('') + '</div></section>';
        }).join('') +
        '<p class="pempty" hidden>No matching disclosures.</p></div>';
    },
    /* Facts: numbered information tiles (MARB proforma etc.) */
    facts: function (b) {
      var items = b.items || [];
      return '<div class="pfacts">' + items.map(function (it) {
        var v = String(it.value || ''), lines = v.split('\n').filter(Boolean), long = plain(v).length > 140;
        return '<div class="pfact' + (long ? ' pfact--wide' : '') + '" data-reveal>' +
          (it.no ? '<span class="pfact__no">' + esc(it.no) + '</span>' : '') +
          '<span class="pfact__l">' + esc(it.label) + '</span>' +
          '<div class="pfact__v' + (lines.length > 1 && lines.some(function (l) { return plain(l).length > 16; }) ? ' pfact__v--stack' : '') + '">' + lines.map(function (l) { return '<span>' + inline(l) + '</span>'; }).join('') + '</div></div>';
      }).join('') + '</div>';
    },
    /* Courses: one card per course with seats / students */
    courses: function (b) {
      var items = b.items || [], max = Math.max.apply(null, items.map(function (c) { return +c.current || 0; }).concat([1]));
      return '<div class="pblock__bar">' + (items.length > 8 ? searchBox('Search courses…') : '') + '<span class="pcount">' + items.length + ' courses</span></div>' +
        '<div class="pcourses">' + items.map(function (c) {
          var deg = (String(c.name).match(/^(MD|MS|DM|MCh|DNB|MBBS)\b/i) || [, ''])[1], nm = String(c.name).replace(/^(MD|MS|DM|MCh|DNB)\s+/i, '');
          var cur = +c.current || 0;
          return '<article class="pcourse" data-reveal><div class="pcourse__top"><span class="pcourse__deg">' + esc(deg || 'PG') + '</span>' +
            (c.year ? '<span class="pcourse__yr">Since ' + esc(c.year) + '</span>' : '') + '</div>' +
            '<h3>' + esc(nm) + '</h3>' +
            '<div class="pcourse__nums"><div><b>' + esc(c.current) + '</b><span>Currently pursuing</span></div><div><b>' + esc(c.admitted) + '</b><span>Admitted</span></div></div>' +
            '<span class="pcourse__bar"><i style="width:' + Math.round(cur / max * 100) + '%"></i></span></article>';
        }).join('') + '</div><p class="pempty" hidden>No matching course.</p>';
    },
    /* Contact: campus cards, quick actions, live map, enquiry form */
    contact: function (b) {
      var lines = function (v) { return Array.isArray(v) ? v : String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
      var camps = (b.campuses || []).map(function (c) { return Object.assign({}, c, { phones: lines(c.phones), emails: lines(c.emails) }); }), tel = function (n) { return 'tel:' + String(n).replace(/[^\d+]/g, ''); };
      var q = encodeURIComponent(b.mapQuery || 'Chirayu Medical College and Hospital, Bhopal');
      return '<div class="ct">' +
        '<div class="ct__quick">' + (b.quick || []).map(function (x) {
          var href = x.type === 'mail' ? 'mailto:' + x.value : x.type === 'map' ? 'https://www.google.com/maps/dir/?api=1&destination=' + q : tel(x.value);
          return '<a class="ct__q" href="' + esc(href) + '"' + (x.type === 'map' ? ' target="_blank" rel="noopener"' : '') + ' data-reveal data-cursor="' + (x.type === 'mail' ? 'Email' : x.type === 'map' ? 'Go' : 'Call') + '">' +
            '<span class="ct__qic">' + icon(x.type === 'mail' ? 'mail' : x.type === 'map' ? 'pin' : 'phone') + '</span><span><small>' + esc(x.label) + '</small><b>' + esc(x.value) + '</b></span></a>';
        }).join('') + '</div>' +
        '<div class="ct__camps">' + camps.map(function (c, i) {
          return '<article class="ct__camp" data-reveal style="--i:' + i + '"><span class="ct__glow" aria-hidden="true"></span>' +
            '<header><span class="ct__cic">' + icon(c.icon || 'college') + '</span><div><span class="ct__kick">' + esc(c.kicker || 'Campus') + '</span><h3>' + esc(c.name) + '</h3></div></header>' +
            '<p class="ct__addr">' + icon('pin') + '<span>' + esc(c.address) + '</span></p>' +
            (c.phones && c.phones.length ? '<div class="ct__row"><span class="ct__lbl">' + icon('phone') + 'Phone</span><div class="ct__chips">' + c.phones.map(function (n) {
              var m = String(n).match(/^(.*?):-?\s*(.+)$/), lab = m ? m[1].trim() : '', num = m ? m[2].trim() : n;
              return '<a class="ct__chip" href="' + esc(tel(num)) + '">' + (lab ? '<i>' + esc(lab) + '</i>' : '') + esc(num) + '</a>';
            }).join('') + '</div></div>' : '') +
            (c.emails && c.emails.length ? '<div class="ct__row"><span class="ct__lbl">' + icon('mail') + 'Email</span><div class="ct__chips">' + c.emails.map(function (e) {
              return '<a class="ct__chip ct__chip--mail" href="mailto:' + esc(e) + '">' + esc(e) + '</a>';
            }).join('') + '</div></div>' : '') +
            '</article>';
        }).join('') + '</div>' +
        '<div class="ct__split">' +
          '<div class="ct__map" data-reveal><iframe title="Map — ' + esc(b.mapQuery || 'Chirayu') + '" src="https://maps.google.com/maps?q=' + q + '&z=15&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' +
            '<a class="ct__mapbtn" href="https://www.google.com/maps/dir/?api=1&destination=' + q + '" target="_blank" rel="noopener">' + icon('pin') + 'Get directions</a></div>' +
          '<form class="ct__form" data-reveal novalidate><span class="kick">' + icon('ecg') + ' Leave a reply</span><h3>Send us a message</h3><p>We usually reply within one working day.</p>' +
            '<div class="ct__grid">' +
              field('name', 'Your name', 'text', 'name', true) + field('email', 'Email', 'email', 'email', true) +
              field('phone', 'Phone (optional)', 'tel', 'tel', false) +
              '<label class="ct__f"><select name="campus">' + ['General enquiry'].concat(camps.map(function (c) { return c.name; })).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select><span>Campus</span></label>' +
              '<label class="ct__f ct__f--wide"><textarea name="message" rows="5" placeholder=" " required minlength="5" maxlength="3000"></textarea><span>Message</span></label>' +
            '</div>' +
            '<input type="text" name="website" tabindex="-1" autocomplete="off" class="ct__hp" aria-hidden="true">' +
            '<button class="btn ct__send" type="submit"><span>Send message</span>' + icon('arrow') + '</button><p class="ct__status" role="status" aria-live="polite"></p></form>' +
        '</div></div>';
      function field(n, l, t, ac, req) {
        return '<label class="ct__f"><input name="' + n + '" type="' + t + '" autocomplete="' + ac + '" placeholder=" "' + (req ? ' required' : '') + (n === 'name' ? ' minlength="2" maxlength="120"' : n === 'phone' ? ' maxlength="20"' : ' maxlength="200"') + '><span>' + l + '</span></label>';
      }
    },
    /* Key figures: big numbers with a label */
    stats: function (b) {
      var items = b.items || [];
      var n = items.length, cols = n <= 4 ? n : (n % 3 === 0 ? 3 : 4);
      return '<div class="pstats" style="--cols:' + cols + '">' + items.map(function (it) {
        return '<div class="pstat" data-reveal><b>' + esc(it.value) + '</b><span>' + esc(it.label) + '</span>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</div>';
      }).join('') + '</div>' + (b.note ? '<p class="pstats__note">' + esc(b.note) + '</p>' : '');
    },
    /* Link cards: departments, sections of a page… */
    cards: function (b) {
      var items = b.items || [];
      return '<div class="pblock__bar">' + (items.length > 9 ? searchBox('Search…') : '') + '<span class="pcount">' + items.length + ' ' + esc(b.unit || 'items') + '</span></div>' +
        '<div class="pcards">' + items.map(function (it, i) {
          var u = safeUrl(it.href), ext = /^https?:|\.pdf(\?|#|$)/i.test(u);
          return '<a class="pcard" href="' + esc(u) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' data-reveal data-cursor="Open">' +
            '<span class="pcard__ic">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy">' : esc(initials(it.title))) + '</span>' +
            '<span class="pcard__t"><b>' + esc(it.title) + '</b>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span>' +
            '<span class="pcard__go">' + icon('arrow') + '</span><span class="pcard__n">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span></a>';
        }).join('') + '</div><p class="pempty" hidden>Nothing matches.</p>';
    },
    /* People: Dean, Vice-Chancellor, Registrar… with contact details */
    people: function (b) {
      var items = b.items || [];
      return '<div class="ppeople">' + items.map(function (it) {
        return '<article class="person" data-reveal>' +
          '<div class="person__photo">' + (it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" loading="lazy">' : '<span>' + esc(initials(it.name)) + '</span>') + '</div>' +
          '<div class="person__body">' + (it.role ? '<span class="person__role">' + esc(it.role) + '</span>' : '') +
          '<h3>' + esc(it.name) + '</h3><div class="person__info">' + rich(it.details) + '</div></div></article>';
      }).join('') + '</div>';
    },
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
    var wide = blocks[0].type === 'disclosures' || blocks[0].type === 'contact' || blocks.some(function (b) { return b.type === 'table' && (b.columns || []).length > 6; });
    var toc = blocks.length > 1 && !wide ? '<aside class="toc" aria-label="On this page"><div class="toc__in"><b>On this page</b>' +
      blocks.map(function (b, i) { return '<a href="#' + blockId(b, i) + '">' + esc(b.title || b.label || 'Section ' + (i + 1)) + '</a>'; }).join('') + '</div></aside>' : '';
    return '<section class="pbody' + (wide ? ' pbody--wide' : '') + '"><div class="wrap pbody__grid' + (toc ? '' : ' pbody__grid--single') + '">' + toc + '<div class="pbody__main">' +
      blocks.map(function (b, i) {
        var showTitle = b.type !== 'button' && b.type !== 'disclosures' && b.type !== 'contact' && b.title;
        return '<section class="pblock pblock--' + b.type + '" id="' + blockId(b, i) + '" data-block="' + i + '">' +
          (showTitle && b.type === 'facts' ? '<header class="dsc__gh pfacts__gh" data-reveal><span class="dsc__gic">' + icon(b.icon || catIcon(b.title)) + '</span><h2 class="pblock__title2">' + esc(b.title) + '</h2><span class="dsc__gn">' + (b.items || []).length + ' items</span></header>' :
           showTitle ? '<div class="head"><div><div class="kick"><svg><use href="#i-ecg"/></svg> ' + esc(i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</div><h2 class="head__title pblock__title" data-split>' + esc(b.title) + '</h2></div></div>' : '') +
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

  /* Dynamic tables: search + column filter + sort + 25 rows at a time.
     Rows are drawn from the data only when they are shown, so even 1,400-row tables stay light. */
  function wireTable(sec, blk) {
    var tbody = $('.ptable tbody', sec), input = $('.psearch input', sec), sel = $('[data-filter]', sec);
    var count = $('.pcount', sec), empty = $('.pempty', sec), more = $('[data-more-rows]', sec), allBtn = $('[data-all-rows]', sec);
    var cols = (blk && blk.columns) || [], src = (blk && blk.rows) || [], narrow = (tbody.dataset.narrow || '').split('');
    var fc = blk && blk.filterCol !== '' && blk.filterCol != null ? +blk.filterCol : -1;
    var data = src.map(function (r, i) {
      var cells = (r && r.cells) || [], txt = cells.map(function (c) { return plain(c).trim(); });
      return { i: i, cells: cells, txt: txt, hay: txt.join(' ').toLowerCase(), f: fc > -1 ? txt[fc] : '' };
    });
    var limit = more ? 25 : Infinity, sortK = -1, dir = 1, cache = {};
    function rowHTML(d) {
      if (cache[d.i]) return cache[d.i];
      return (cache[d.i] = '<tr class="is-visible">' + cols.map(function (c, k) {
        var t = d.txt[k] || '', cl = narrow[k] === '1' ? ' class="c-narrow"' : t.length > 26 ? ' class="c-long"' : t.length <= 18 ? ' class="c-short"' : '';
        return (k === 0 ? '<th scope="row"' : '<td') + cl + ' data-label="' + esc(c) + '">' + rich(d.cells[k]) + (k === 0 ? '</th>' : '</td>');
      }).join('') + '</tr>');
    }
    function num(v) { var m = v.replace(/[₹,\s]/g, '').match(/^-?\d+(\.\d+)?$/); return m ? parseFloat(m[0]) : NaN; }
    function dt(v) { var m = v.match(/^(\d{1,2})[-\/.]\s*(\d{1,2})[-\/.]\s*(\d{4})$/); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : NaN; }
    function cmp(a, b) {
      var x = a.txt[sortK] || '', y = b.txt[sortK] || '', nx = num(x), ny = num(y);
      if (!isNaN(nx) && !isNaN(ny)) return (nx - ny) * dir;
      var dx = dt(x), dy = dt(y);
      if (!isNaN(dx) && !isNaN(dy)) return (dx - dy) * dir;
      return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) * dir || a.i - b.i;
    }
    function apply() {
      var q = input ? input.value.trim().toLowerCase() : '', f = sel ? sel.value : '';
      var hits = data.filter(function (d) { return (!f || d.f === f) && (!q || d.hay.indexOf(q) > -1); });
      if (sortK > -1) hits.sort(cmp);
      var shown = Math.min(hits.length, limit);
      tbody.innerHTML = hits.slice(0, shown).map(rowHTML).join('');
      count.textContent = (q || f ? hits.length + ' of ' + data.length : data.length) + ' entries' + (shown < hits.length ? ' · showing ' + shown : '');
      empty.hidden = hits.length > 0;
      if (more) { more.parentNode.hidden = shown >= hits.length; more.textContent = 'Show ' + Math.min(25, hits.length - shown) + ' more'; }
    }
    var tmr;
    if (input) input.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(apply, data.length > 300 ? 120 : 0); });
    if (sel) sel.addEventListener('change', apply);
    if (more) more.addEventListener('click', function () { limit += 25; apply(); });
    if (allBtn) allBtn.addEventListener('click', function () { limit = Infinity; apply(); });
    $$('[data-sort]', sec).forEach(function (bt) {
      bt.addEventListener('click', function () {
        var k = +bt.dataset.sort;
        if (sortK === k) { dir = -dir; if (dir === 1) sortK = -1; } else { sortK = k; dir = 1; }
        $$('[data-sort]', sec).forEach(function (o) { o.removeAttribute('data-dir'); });
        if (sortK > -1) bt.setAttribute('data-dir', dir > 0 ? 'asc' : 'desc');
        apply();
      });
    });
    // wide tables: show the sideways-scroll hint only while there is more to the right
    var wrap = $('.ptable-wrap--wide', sec), hint = $('.pscroll-hint', sec);
    if (wrap) {
      var upd = function () { var end = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4; wrap.classList.toggle('is-end', end); wrap.classList.toggle('is-start', wrap.scrollLeft < 4); if (hint) hint.hidden = wrap.scrollWidth <= wrap.clientWidth + 4; };
      wrap.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); setTimeout(upd, 60);
    }
    apply();
    if (wrap) setTimeout(function () { wrap.dispatchEvent(new Event('scroll')); }, 80);
  }

  /* search, show-more, lightbox */
  function wireBlocks(p) {
    $$('.pblock').forEach(function (sec) {
      if ($('.dsc', sec)) return; // has its own filter (below)
      if ($('.ptable', sec) && !$('.pfac', sec)) { wireTable(sec, (p.blocks || [])[+sec.dataset.block]); return; }
      var input = $('.psearch input', sec), more = $('[data-more]', sec), count = $('.pcount', sec), empty = $('.pempty', sec);
      var rows = $$('.ptable tbody tr:not(.fac-row), .pfile, .fac, .pcard, .pcourse', sec), frows = $$('.fac-row', sec), total = rows.length, unit = sec.classList.contains('pblock--files') ? 'documents' : sec.classList.contains('pblock--faculty') ? 'members' : sec.classList.contains('pblock--cards') ? 'items' : 'entries';
      if (input) {
        input.addEventListener('input', function () {
          var q = input.value.trim().toLowerCase(), shown = 0;
          if (q && more) { more.hidden = true; sec.classList.add('is-expanded'); }
          rows.forEach(function (r, i) {
            var hit = !q || r.textContent.toLowerCase().indexOf(q) > -1;
            r.hidden = !hit; if (hit) shown++;
            if (frows[i]) frows[i].hidden = !hit;
            if (hit) r.classList.add('is-visible');
          });
          count.textContent = q ? shown + ' of ' + total + ' ' + unit : total + ' ' + unit;
          if (empty) empty.hidden = shown > 0;
        });
      }
      if (more) more.addEventListener('click', function () { sec.classList.add('is-expanded'); more.hidden = true; });
    });

    // contact form → Supabase contact_messages (insert-only), mailto as fallback
    $$('.ct__form').forEach(function (f) {
      var st = $('.ct__status', f), btn = $('.ct__send', f);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (f.website.value) return; // bot
        if (!f.checkValidity()) { f.classList.add('was-checked'); st.textContent = 'Please fill in your name, a valid email and a message.'; st.className = 'ct__status is-err'; return; }
        var body = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() || null, campus: f.campus.value, message: f.message.value.trim() };
        btn.disabled = true; f.classList.add('is-sending'); st.textContent = 'Sending…'; st.className = 'ct__status';
        fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_messages', {
          method: 'POST', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body)
        }).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          f.reset(); f.classList.remove('was-checked'); f.classList.add('is-sent');
          st.textContent = 'Thank you! Your message has been sent.'; st.className = 'ct__status is-ok';
        }).catch(function () {
          st.innerHTML = 'Could not send right now. Please email us at <a href="mailto:info@cmchbhopal.com?subject=' + encodeURIComponent('Website enquiry — ' + body.name) + '&body=' + encodeURIComponent(body.message) + '">info@cmchbhopal.com</a>.';
          st.className = 'ct__status is-err';
        }).then(function () { btn.disabled = false; f.classList.remove('is-sending'); setTimeout(function () { f.classList.remove('is-sent'); }, 2500); });
      });
    });

    // disclosures: category chips + search
    $$('.dsc').forEach(function (d) {
      var chips = $$('.dsc__chip', d), input = $('.psearch input', d), empty = $('.pempty', d), cat = '';
      function apply() {
        var q = input ? input.value.trim().toLowerCase() : '', shown = 0;
        $$('.dsc__group', d).forEach(function (g) {
          var inCat = !cat || g.dataset.group === cat, any = 0;
          $$('.dsc__item', g).forEach(function (a) {
            var hit = inCat && (!q || a.textContent.toLowerCase().indexOf(q) > -1);
            a.hidden = !hit; if (hit) { any++; a.classList.add('is-visible'); }
          });
          g.hidden = !any; shown += any;
          if (any) $('.dsc__gh', g).classList.add('is-visible');
        });
        empty.hidden = shown > 0;
      }
      chips.forEach(function (c) { c.addEventListener('click', function () { chips.forEach(function (x) { x.classList.toggle('is-on', x === c); }); cat = c.dataset.cat; apply(); }); });
      if (input) input.addEventListener('input', apply);
    });

    // faculty: Cards / Table view (one choice for the whole page, remembered)
    var view = 'cards';
    try { view = localStorage.getItem('cmch_fac_view') || 'cards'; } catch (e) { /* ignore */ }
    function setView(v) {
      view = v; document.body.classList.toggle('fac-table-view', v === 'table');
      $$('[data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === v); });
      try { localStorage.setItem('cmch_fac_view', v); } catch (e) { /* ignore */ }
    }
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
    if ($('.pfac')) setView(view);

    // faculty cards: tap / Enter toggles the details panel
    $$('.fac').forEach(function (c) {
      function t() { var on = !c.classList.contains('is-open'); $$('.fac.is-open').forEach(function (o) { o.classList.remove('is-open'); }); c.classList.toggle('is-open', on); }
      c.addEventListener('click', t);
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
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
  var THEMES = ['medlab']; // final design: Cinematic Light 3D only
  var THEME_COLORS = { medlab: '#F3F8FA', classic: '#0A8E97', cinema: '#06161C', clean: '#0A8E97', bold: '#FFC94A' };
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
      var t = e.target.closest && e.target.closest('.btn, .pfile, .pcta, .dsc__item');
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
    var looping = false;
    function loop() { rx += (mx - rx) * .18; ry += (my - ry) * .18; ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)'; if (Math.abs(mx - rx) + Math.abs(my - ry) > .3) requestAnimationFrame(loop); else looping = false; }
    document.addEventListener('mousemove', function () { if (!looping) { looping = true; requestAnimationFrame(loop); } }, { passive: true });
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
