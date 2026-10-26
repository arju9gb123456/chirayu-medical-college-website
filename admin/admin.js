/* =========================================================
   CMCH Website — Admin panel
   Saves to Supabase table site_content (key = 'home').
   Without Supabase config it runs in draft mode (browser only).
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.CMCH_CONFIG || {};
  var BUCKET = CFG.storageBucket || 'site-media';
  /* The document being edited: 'home' or 'page:<slug>' (same as its Supabase key) */
  var DOC = 'home';
  function isHome() { return DOC === 'home'; }
  function docSlug() { return DOC.slice(5); }
  function draftKey() { return isHome() ? 'cmch_admin_draft_home' : 'cmch_admin_draft_page:' + docSlug(); }
  function fileUrl() { return isHome() ? '../content/home.json' : '../content/pages/' + docSlug().split('/').map(encodeURIComponent).join('/') + '.json'; }
  var RESERVED = ['admin', 'assets', 'content', 'page', 'images', 'pdf', 'supabase', 'tools', 'index'];

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function icon(id) { return '<svg><use href="#a-' + id + '"/></svg>'; }

  /* ---------------- Content model ---------------- */
  var COLORS = [['teal', 'Teal'], ['red', 'Red'], ['indigo', 'Indigo'], ['amber', 'Amber']];
  var ICONS = [['file', 'Document'], ['bell', 'Bell'], ['cap', 'Graduation cap']];

  var HOME_SECTIONS = [
    { id: 'slides', path: 'hero.slides', title: 'Hero slider', icon: 'image', item: 'slide',
      desc: 'Big 3D slider at the top of the homepage.', titleKey: 'title', subKey: 'capTitle', imgKey: 'img',
      fields: [
        { k: 'img', l: 'Slide image', t: 'image', req: 1, wide: 1, hint: 'Landscape photo, at least 1400px wide.' },
        { k: 'title', l: 'Heading', t: 'text', req: 1 },
        { k: 'capTitle', l: 'Card caption', t: 'text' },
        { k: 'lede', l: 'Text under heading', t: 'textarea', wide: 1 },
        { k: 'capSub', l: 'Card sub-caption', t: 'text' }
      ] },
    { id: 'facts', path: 'hero.facts', title: 'Hero numbers', icon: 'hash', item: 'number', max: 4,
      desc: 'The numbers under the hero text. Digits count up when the page opens.', titleKey: 'value', subKey: 'label',
      fields: [
        { k: 'value', l: 'Number', t: 'text', req: 1, hint: 'e.g. 1992' },
        { k: 'unit', l: 'Unit (optional)', t: 'text', hint: 'e.g. beds' },
        { k: 'label', l: 'Label', t: 'text', wide: 1 }
      ] },
    { id: 'ticker', path: 'ticker', title: 'Breaking news', icon: 'bolt', item: 'headline',
      desc: 'Scrolling strip below the hero.', titleKey: 'text', subKey: 'tag',
      fields: [
        { k: 'text', l: 'Headline', t: 'text', req: 1, wide: 1 },
        { k: 'tag', l: 'Tag', t: 'text', hint: 'e.g. Academics, or a date' },
        { k: 'color', l: 'Tag colour', t: 'select', opts: COLORS },
        { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }
      ] },
    { id: 'notices', path: 'notices', title: 'Important notices', icon: 'file', item: 'notice',
      desc: 'First tab in the "Chirayu Covid Care Hospital" box.', titleKey: 'text',
      fields: [
        { k: 'text', l: 'Notice text', t: 'textarea', req: 1, wide: 1 },
        { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }
      ] },
    { id: 'media', path: 'media', title: 'Media tab', icon: 'play', item: 'row',
      desc: 'Second tab: YouTube videos, or plain links.', titleKey: 'title', ytKey: 'video',
      fields: [
        { k: 'title', l: 'Title', t: 'text', req: 1, wide: 1 },
        { k: 'video', l: 'YouTube video', t: 'youtube', wide: 1, hint: 'Paste a YouTube link. Leave empty to use a normal link instead.' },
        { k: 'href', l: 'Link (when not a video)', t: 'link', wide: 1 }
      ] },
    { id: 'upcoming', path: 'upcomingEvents', title: 'Upcoming events', icon: 'cal', item: 'event',
      desc: 'Third tab. When empty, the site shows "Coming soon".', titleKey: 'title',
      fields: [
        { k: 'title', l: 'Event', t: 'text', req: 1, wide: 1 },
        { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }
      ] },
    { id: 'student', path: 'studentInfo', title: 'Student info board', icon: 'cap', item: 'notice',
      desc: 'Dark auto-scrolling board next to the notices.', titleKey: 'text', newKey: 'isNew',
      fields: [
        { k: 'text', l: 'Title', t: 'text', req: 1, wide: 1 },
        { k: 'icon', l: 'Icon', t: 'select', opts: ICONS },
        { k: 'isNew', l: 'Show NEW badge', t: 'check' },
        { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }
      ] },
    { id: 'videos', path: 'videos', title: 'Video gallery', icon: 'play', item: 'video',
      desc: 'Video cards. The first one is shown large.', titleKey: 'title', ytKey: 'video',
      fields: [
        { k: 'video', l: 'YouTube video', t: 'youtube', req: 1, wide: 1 },
        { k: 'title', l: 'Title', t: 'text', req: 1, wide: 1 },
        { k: 'tag', l: 'Tag (optional)', t: 'text' }
      ] },
    { id: 'news', path: 'news', title: 'Latest news', icon: 'news', item: 'news card',
      desc: 'News cards. The first one is shown large.', titleKey: 'title', subKey: 'month', imgKey: 'img',
      fields: [
        { k: 'img', l: 'Photo', t: 'image', wide: 1 },
        { k: 'title', l: 'Title', t: 'text', req: 1, wide: 1 },
        { k: 'day', l: 'Day', t: 'text', hint: 'e.g. 29' },
        { k: 'month', l: 'Month, year', t: 'text', hint: 'e.g. October, 2022' },
        { k: 'tag', l: 'Category', t: 'text' },
        { k: 'color', l: 'Category colour', t: 'select', opts: COLORS },
        { k: 'href', l: 'Link', t: 'link', wide: 1 }
      ] },
    { id: 'gallery', path: 'gallery', title: 'Photo gallery', icon: 'grid', item: 'category',
      desc: 'Category tiles that open the event albums.', titleKey: 'title', imgKey: 'img',
      fields: [
        { k: 'img', l: 'Cover photo', t: 'image', req: 1, wide: 1 },
        { k: 'title', l: 'Category name', t: 'text', req: 1 },
        { k: 'href', l: 'Link', t: 'link' }
      ] },
    { id: 'blocks', path: 'blocks', title: 'Page sections', icon: 'layout', type: 'object',
      desc: 'Text and photos in About, Chairman, Virtual Tour and Course sections.',
      groups: [
        { h: 'About Chirayu', fields: [
          { k: 'aboutImg1', l: 'Main photo', t: 'image' },
          { k: 'aboutImg2', l: 'Small photo', t: 'image' },
          { k: 'aboutLead', l: 'Intro (large text)', t: 'textarea', wide: 1 },
          { k: 'aboutP1', l: 'Paragraph 2', t: 'textarea', wide: 1 },
          { k: 'aboutP2', l: 'Paragraph 3', t: 'textarea', wide: 1 } ] },
        { h: 'Dr. Ajay Goenka', fields: [
          { k: 'chairmanPhoto', l: 'Portrait', t: 'image' },
          { k: 'chairmanVideo', l: 'Documentary video', t: 'youtube' },
          { k: 'chairmanQuote', l: 'Quote', t: 'text', wide: 1 },
          { k: 'chairmanP1', l: 'Paragraph 1', t: 'textarea', wide: 1 },
          { k: 'chairmanP2', l: 'Paragraph 2', t: 'textarea', wide: 1 } ] },
        { h: 'Virtual tour', fields: [
          { k: 'tourHospitalImg', l: 'Hospital panel photo', t: 'image' },
          { k: 'tourCollegeImg', l: 'College panel photo', t: 'image' } ] },
        { h: 'Courses & achievements', fields: [
          { k: 'courseImg', l: 'Course Offered image', t: 'image' },
          { k: 'empanelImg', l: 'Hospital empanelled image', t: 'image' },
          { k: 'achieveImg', l: 'Achievements image', t: 'image' },
          { k: 'pgSeatsText', l: 'PG seats card text', t: 'text' } ] }
      ] },
    { id: 'menu', path: 'menu', title: 'Main menu', icon: 'grid', item: 'menu item',
      desc: 'Top menu on every page (and the mobile menu). Links added under an item open as its dropdown.', titleKey: 'label', subKey: 'href',
      fields: [
        { k: 'label', l: 'Name', t: 'text', req: 1 },
        { k: 'href', l: 'Link', t: 'link', hint: 'Leave empty when the item only opens a dropdown.' },
        { k: 'children', l: 'Dropdown links', t: 'sublist', sub: 'menulink', subLabel: 'link', wide: 1,
          hint: 'More than 6 links, or a heading, shows the dropdown in two columns.' }
      ] },
    { id: 'footer', path: 'footerCols', title: 'Footer links', icon: 'layout', item: 'column',
      desc: 'Link columns in the footer of every page.', titleKey: 'title',
      fields: [
        { k: 'title', l: 'Column heading', t: 'text' },
        { k: 'hideTitle', l: 'Hide the heading (continues the column before it)', t: 'check' },
        { k: 'links', l: 'Links', t: 'sublist', sub: 'footlink', subLabel: 'link', wide: 1 }
      ] },
    { id: 'contact', path: 'contact', title: 'Contact & top bar', icon: 'users', type: 'object',
      desc: 'Phone, email and address (top bar, hero and footer), the top-bar alert and quick links, and social media.',
      groups: [
        { h: 'Contact', fields: [
          { k: 'phone', l: 'Phone (as shown)', t: 'text', hint: 'e.g. 0755 2709101/102/103' },
          { k: 'phoneDial', l: 'Number to dial', t: 'text', hint: 'Digits only, e.g. 07552709101' },
          { k: 'email', l: 'Email', t: 'text', wide: 1 },
          { k: 'address', l: 'Address', t: 'textarea', wide: 1 } ] },
        { h: 'Top bar alert', fields: [
          { k: 'alertLabel', l: 'Alert text', t: 'text', hint: 'Leave empty to hide it.' },
          { k: 'alertHref', l: 'Alert link', t: 'link' },
          { k: 'alertNew', l: 'Show NEW badge on the alert', t: 'check' } ] },
        { h: 'Top bar links', fields: [
          { k: 'sitemap', l: 'Sitemap', t: 'link' },
          { k: 'webmail', l: 'Web Mail', t: 'link' },
          { k: 'hodmail', l: "Hod's Mail", t: 'link' },
          { k: 'cms', l: 'CMS Login', t: 'link' } ] },
        { h: 'Social media (empty = hidden)', fields: [
          { k: 'facebook', l: 'Facebook', t: 'text' },
          { k: 'youtube', l: 'YouTube', t: 'text' },
          { k: 'twitter', l: 'X / Twitter', t: 'text' },
          { k: 'linkedin', l: 'LinkedIn', t: 'text' },
          { k: 'instagram', l: 'Instagram', t: 'text' } ] },
        { h: 'Footer bottom line', fields: [
          { k: 'copyright', l: 'Copyright text', t: 'text', wide: 1 },
          { k: 'credit', l: 'Credit text', t: 'text', wide: 1 } ] }
      ] },
    { id: 'settings', path: '', title: 'Design & settings', icon: 'layout', type: 'object',
      desc: 'Which website design visitors see first, and the footer visitor counter.',
      groups: [
        { h: 'Website design', fields: [
          { k: 'theme', l: 'Default design', t: 'select', opts: [['cinema', 'Cinematic dark'], ['classic', 'Original'], ['clean', 'Clean bright'], ['bold', 'Bold & energetic']], hint: 'Shown to visitors who have not picked a design themselves.' },
          { k: 'themeSwitcher', l: 'Show the design switcher in the top bar', t: 'check' } ] },
        { h: 'Visitor counter', fields: [{ k: 'visitorBase', l: 'Starting visitor count', t: 'number' }] }
      ] }
  ];

  /* ---------------- Inner pages: block types ---------------- */
  var BLOCK_TYPES = {
    table: { label: 'Table', icon: 'grid', sub: 'rows', subLabel: 'row', hint: 'Two or more columns, one row per entry. Mobile shows each row as a card.' },
    files: { label: 'Documents list', icon: 'file', sub: 'items', subLabel: 'document', hint: 'PDFs or links with a download button. Visitors can search the list.' },
    gallery: { label: 'Photo gallery', icon: 'image', sub: 'items', subLabel: 'photo', hint: 'Certificates or photos; click opens a full-size viewer.' },
    text: { label: 'Text', icon: 'news', hint: 'Paragraphs. Formatting: **bold**, [link text](https://…), lines starting with "- " become bullets.' },
    button: { label: 'Button', icon: 'ext', hint: 'One big button to a page, PDF or form.' }
  };
  var BLOCK_FIELDS = {
    table: [{ k: 'title', l: 'Heading', t: 'text', wide: 1 }, { k: 'columns', l: 'Column names (separate with | )', t: 'csv', wide: 1, hint: 'e.g. Permissions | Date of Application / Permission' }],
    files: [{ k: 'title', l: 'Heading', t: 'text', wide: 1 }],
    gallery: [{ k: 'title', l: 'Heading', t: 'text', wide: 1 }],
    text: [{ k: 'title', l: 'Heading', t: 'text', wide: 1 }, { k: 'body', l: 'Text', t: 'textarea', wide: 1, rows: 8 }],
    button: [{ k: 'title', l: 'Name in "On this page" list', t: 'text' }, { k: 'label', l: 'Button text', t: 'text', req: 1 }, { k: 'href', l: 'Link or PDF', t: 'link', req: 1, wide: 1 }, { k: 'note', l: 'Small note under the text (optional)', t: 'text', wide: 1 }]
  };
  var SUB_FIELDS = {
    files: [{ k: 'title', l: 'Document name', t: 'text', req: 1, wide: 1 }, { k: 'href', l: 'PDF or link', t: 'link', req: 1, wide: 1 }, { k: 'date', l: 'Date / note (optional)', t: 'text' }],
    gallery: [{ k: 'img', l: 'Photo', t: 'image', req: 1, wide: 1 }, { k: 'caption', l: 'Caption', t: 'text', wide: 1 }],
    menulink: [{ k: 'label', l: 'Name', t: 'text', req: 1 }, { k: 'heading', l: 'Small heading, not a link', t: 'check' }, { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }],
    footlink: [{ k: 'label', l: 'Name', t: 'text', req: 1 }, { k: 'href', l: 'Link or PDF', t: 'link', wide: 1 }]
  };
  function newSubRow(type) {
    var o = {};
    (SUB_FIELDS[type] || []).forEach(function (f) { o[f.k] = f.t === 'check' ? false : ''; });
    return o;
  }
  function newBlock(type) {
    var b = { type: type, id: type + '-' + Date.now().toString(36), title: '' };
    if (type === 'table') { b.columns = ['Particulars', 'Details']; b.rows = [{ cells: ['', ''] }]; }
    if (type === 'files' || type === 'gallery') b.items = [];
    if (type === 'text') b.body = '';
    if (type === 'button') { b.label = ''; b.href = ''; }
    return b;
  }

  var PAGE_SECTIONS = [
    { id: 'details', path: '', title: 'Page details', icon: 'layout', type: 'object',
      desc: 'Title, breadcrumb and short intro at the top of the page.',
      groups: [{ h: '', fields: [
        { k: 'title', l: 'Page title', t: 'text', req: 1, wide: 1 },
        { k: 'kicker', l: 'Menu section (breadcrumb)', t: 'text', hint: 'e.g. IMP(NMC) Req' },
        { k: 'updatedBy', l: 'Updated by', t: 'text', hint: 'e.g. CMCH Admin' },
        { k: 'intro', l: 'Short intro', t: 'textarea', wide: 1 },
        { k: 'updated', l: 'Last updated (set automatically when you publish)', t: 'text' },
        { k: 'banner', l: 'Banner photo (optional)', t: 'image', wide: 1, hint: 'Wide photo behind the title. Leave empty for the plain design.' } ] }] },
    { id: 'content', path: 'blocks', title: 'Page content', icon: 'news', type: 'blocks', item: 'block',
      desc: 'Tables, document lists, galleries, text and buttons, in the order they appear on the page.' }
  ];
  var PAGE_DETAIL_KEYS = ['title', 'kicker', 'intro', 'updated', 'updatedBy', 'banner'];

  var SECTIONS = HOME_SECTIONS;
  var SEC = {};
  function indexSections() { SEC = {}; SECTIONS.forEach(function (s) { SEC[s.id] = s; }); }
  indexSections();

  /* ---------------- State ---------------- */
  var S = {
    data: null, saved: '', sec: 'slides', open: {}, sb: null, user: null,
    mode: 'draft', showErrors: false, meta: null, drag: null
  };

  function getPath(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }
  function list(sec) { return getPath(S.data, sec.path) || []; }
  function isDirty() { return JSON.stringify(S.data) !== S.saved; }
  function secDirty(sec) {
    if (!S.saved) return true;
    var saved = JSON.parse(S.saved);
    var pick = function (d) {
      if (!isHome()) return PAGE_DETAIL_KEYS.map(function (k) { return d[k]; });
      return [d.visitorBase, d.theme, d.themeSwitcher];
    };
    var a = sec.path ? getPath(S.data, sec.path) : pick(S.data);
    var b = sec.path ? getPath(saved, sec.path) : pick(saved);
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  function normalize(c) { return isHome() ? normalizeHome(c) : normalizePage(c); }
  function normalizePage(c) {
    c = c || {};
    PAGE_DETAIL_KEYS.forEach(function (k) { if (typeof c[k] !== 'string') c[k] = c[k] == null ? '' : String(c[k]); });
    if (!Array.isArray(c.blocks)) c.blocks = [];
    c.blocks.forEach(function (b) {
      if (!BLOCK_TYPES[b.type]) b.type = 'text';
      if (b.type === 'table') {
        if (!Array.isArray(b.columns) || !b.columns.length) b.columns = ['Particulars', 'Details'];
        if (!Array.isArray(b.rows)) b.rows = [];
        b.rows.forEach(function (r) { if (!Array.isArray(r.cells)) r.cells = []; });
      }
      if ((b.type === 'files' || b.type === 'gallery') && !Array.isArray(b.items)) b.items = [];
    });
    return c;
  }
  function normalizeHome(c) {
    c = c || {};
    c.hero = c.hero || {};
    ['slides', 'facts'].forEach(function (k) { if (!Array.isArray(c.hero[k])) c.hero[k] = []; });
    ['ticker', 'notices', 'media', 'upcomingEvents', 'studentInfo', 'videos', 'news', 'gallery'].forEach(function (k) {
      if (!Array.isArray(c[k])) c[k] = [];
    });
    c.blocks = c.blocks || {};
    if (!Array.isArray(c.menu)) c.menu = [];
    c.menu.forEach(function (m) { if (!Array.isArray(m.children)) m.children = []; });
    if (!Array.isArray(c.footerCols)) c.footerCols = [];
    c.footerCols.forEach(function (f) { if (!Array.isArray(f.links)) f.links = []; });
    if (!c.contact || typeof c.contact !== 'object') c.contact = {};
    if (typeof c.visitorBase !== 'number') c.visitorBase = parseInt(c.visitorBase, 10) || 0;
    if (['classic', 'cinema', 'clean', 'bold'].indexOf(c.theme) < 0) c.theme = 'cinema';
    if (typeof c.themeSwitcher !== 'boolean') c.themeSwitcher = true;
    return c;
  }

  function writeDraft() {
    try { localStorage.setItem(draftKey(), JSON.stringify(S.data)); } catch (e) { /* storage blocked */ }
  }

  /* ---------------- Screens ---------------- */
  function show(name) {
    ['setup', 'login', 'recover', 'denied', 'app'].forEach(function (n) {
      $('#screen-' + n).hidden = n !== name;
    });
    var f = $('#screen-' + name + ' input');
    if (f) setTimeout(function () { f.focus(); }, 50);
  }

  /* ---------------- Toasts & dialogs ---------------- */
  function toast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    t.innerHTML = icon(type === 'error' ? 'x' : 'check') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }, type === 'error' ? 6000 : 3500);
  }
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var m = $('#confirm');
      $('#confirm-title').textContent = o.title;
      $('#confirm-text').textContent = o.text || '';
      var yes = $('[data-yes]', m), no = $('[data-no]', m);
      yes.textContent = o.yes || 'Delete';
      no.textContent = o.no || 'Cancel';
      yes.className = 'btn ' + (o.danger === false ? 'btn--primary' : 'btn--danger');
      m.hidden = false; yes.focus();
      function done(v) { m.hidden = true; yes.onclick = no.onclick = m.onclick = null; document.removeEventListener('keydown', key); resolve(v); }
      function key(e) { if (e.key === 'Escape') done(false); }
      yes.onclick = function () { done(true); };
      no.onclick = function () { done(false); };
      m.onclick = function (e) { if (e.target === m) done(false); };
      document.addEventListener('keydown', key);
    });
  }

  /* ---------------- Rendering ---------------- */
  /* Nav is built once and then only updated in place, so a click is never
     lost when an input's blur/change re-renders the status. */
  function renderNav() {
    var nav = $('#side-nav');
    if (!nav.children.length) {
      nav.innerHTML = SECTIONS.map(function (s) {
        return '<button class="navbtn" data-sec="' + s.id + '">' + icon(s.icon) + '<span>' + esc(s.title) + '</span>' +
          '<span class="dot" title="Unpublished changes" hidden></span>' +
          (s.type === 'object' ? '' : '<span class="count"></span>') + '</button>';
      }).join('');
    }
    SECTIONS.forEach(function (s) {
      var b = $('[data-sec="' + s.id + '"]', nav);
      b.setAttribute('aria-current', S.sec === s.id ? 'true' : 'false');
      $('.dot', b).hidden = !secDirty(s);
      var c = $('.count', b);
      if (c) c.textContent = list(s).length;
    });
  }

  function updateStatus() {
    var st = $('#status'), dirty = isDirty();
    st.classList.toggle('is-dirty', dirty);
    var txt;
    if (S.mode === 'draft') txt = dirty ? 'Draft differs from the live file' : 'Same as the live file';
    else txt = dirty ? 'Unpublished changes' : 'All changes published';
    $('span', st).textContent = txt;
    $('#btn-save').disabled = S.mode === 'supabase' && !dirty;
    renderNav();
  }

  function changed() {
    writeDraft();
    updateStatus();
  }

  function emptyVal(v) { return v == null || String(v).trim() === ''; }

  function fieldHTML(f, val, path, ctx) {
    var req = f.req ? ' <em>*</em>' : '';
    var invalid = S.showErrors && f.req && emptyVal(val) ? ' is-invalid' : '';
    var wide = f.wide ? ' field--wide' : '';
    var hint = f.hint ? '<small>' + esc(f.hint) + '</small>' : '';
    var id = 'f-' + path.replace(/\./g, '-');
    var label = '<span>' + esc(f.l) + req + '</span>';
    switch (f.t) {
      case 'textarea':
        return '<label class="field' + wide + invalid + '">' + label + '<textarea id="' + id + '" data-path="' + path + '" data-t="textarea" rows="' + (f.rows || 3) + '">' + esc(val) + '</textarea>' + hint + '</label>';
      case 'csv':
        return '<label class="field' + wide + '">' + label + '<input type="text" data-path="' + path + '" data-t="csv" value="' + esc((val || []).join(' | ')) + '">' + hint + '</label>';
      case 'number':
        return '<label class="field' + wide + invalid + '">' + label + '<input type="number" min="0" id="' + id + '" data-path="' + path + '" data-t="number" value="' + esc(val) + '">' + hint + '</label>';
      case 'select':
        return '<label class="field' + wide + '">' + label + '<select data-path="' + path + '" data-t="select">' + f.opts.map(function (o) {
          return '<option value="' + o[0] + '"' + ((val || f.opts[0][0]) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>' + hint + '</label>';
      case 'check':
        return '<label class="check' + wide + '"><input type="checkbox" data-path="' + path + '" data-t="check"' + (val ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      case 'image':
        return '<div class="field' + wide + invalid + '">' + label +
          '<div class="media"><div class="media__prev" data-drop="' + path + '" title="Drop a photo here">' + (val ? '<img src="' + esc(resolve(val)) + '" alt="">' : icon('image')) + '</div>' +
          '<div class="media__ctl"><input type="text" data-path="' + path + '" data-t="image" value="' + esc(val) + '" placeholder="https://… or images/photo.jpg" aria-label="' + esc(f.l) + ' link">' +
          '<div class="media__btns"><button type="button" class="btn btn--ghost btn--sm" data-upload="' + path + '" data-accept="image/*">' + icon('upload') + ' Upload photo</button>' +
          (val ? '<button type="button" class="btn btn--ghost btn--sm" data-clear="' + path + '">Remove</button>' : '') + '</div>' +
          '<div class="progress" hidden><i></i></div>' + hint + '</div></div></div>';
      case 'link':
        return '<div class="field' + wide + invalid + '">' + label +
          '<div class="inline"><input type="text" data-path="' + path + '" data-t="link" value="' + esc(val) + '" placeholder="page-name/ or https://… or file.pdf" aria-label="' + esc(f.l) + '">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-upload="' + path + '" data-accept=".pdf,image/*" title="Upload a PDF">' + icon('upload') + ' PDF</button>' +
          '<a class="iconbtn" data-open-link href="' + esc(resolve(val)) + '" target="_blank" rel="noopener" title="Open link" aria-label="Open link">' + icon('ext') + '</a></div>' +
          '<div class="progress" hidden><i></i></div>' + hint +
          (isOldServer(val) ? '<small class="oldlink">Still on the old website server. Upload the PDF here to move it to the new site.</small>' : '') + '</div>';
      case 'sublist':
        return subListHTML(path, Array.isArray(val) ? val : [], f.subLabel || 'link', f.sub, f.l, subFieldsFor(f.sub)) +
          (f.hint ? '<p class="muted field--wide sub__hint">' + esc(f.hint) + '</p>' : '');
      case 'youtube':
        var vid = ytId(val);
        return '<div class="field' + wide + invalid + '">' + label +
          '<div class="yt"><img data-yt-thumb src="' + (vid ? 'https://i.ytimg.com/vi/' + esc(vid) + '/mqdefault.jpg' : '') + '" alt=""' + (vid ? '' : ' style="visibility:hidden"') + '>' +
          '<div class="media__ctl"><input type="text" data-path="' + path + '" data-t="youtube" value="' + esc(val) + '" placeholder="https://www.youtube.com/watch?v=…" aria-label="' + esc(f.l) + '">' + hint + '</div></div></div>';
      default:
        return '<label class="field' + wide + invalid + '">' + label + '<input type="text" id="' + id + '" data-path="' + path + '" data-t="text" value="' + esc(val) + '">' + hint + '</label>';
    }
  }

  function headHTML(sec, it, i, n) {
    var title = it[sec.titleKey] || '';
    var sub = sec.subKey ? it[sec.subKey] : '';
    var thumb = '';
    if (sec.type === 'blocks') {
      var bt = BLOCK_TYPES[it.type] || BLOCK_TYPES.text, subArr = bt.sub ? (it[bt.sub] || []) : null;
      title = it.title || it.label || '';
      sub = bt.label + (subArr ? ' · ' + subArr.length + ' ' + bt.subLabel + (subArr.length === 1 ? '' : 's') : '');
      thumb = '<span class="item__type">' + icon(bt.icon) + '</span>';
    }
    if (sec.imgKey) thumb = it[sec.imgKey] ? '<img class="item__thumb" src="' + esc(resolve(it[sec.imgKey])) + '" alt="">' : '<span class="item__thumb"></span>';
    if (sec.ytKey && ytId(it[sec.ytKey])) thumb = '<img class="item__thumb" src="https://i.ytimg.com/vi/' + esc(ytId(it[sec.ytKey])) + '/default.jpg" alt="">';
    var badges = (it.demo ? '<span class="badge" title="Temporary web image, replace with a real photo">Demo photo</span>' : '') +
      (sec.newKey && it[sec.newKey] ? '<span class="badge badge--new">NEW</span>' : '');
    return '<span class="handle" data-handle title="Drag to reorder">' + icon('drag') + '</span>' +
      '<span class="item__num">' + (i + 1) + '</span>' + thumb +
      '<span class="item__title">' + (title ? esc(title) : '<i class="muted">Untitled ' + esc(sec.type === 'blocks' ? (BLOCK_TYPES[it.type] || {}).label || sec.item : sec.item) + '</i>') + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + badges +
      '<span class="item__tools">' +
      '<button type="button" class="iconbtn" data-act="up" title="Move up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
      '<button type="button" class="iconbtn" data-act="down" title="Move down" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>' + icon('down') + '</button>' +
      '<button type="button" class="iconbtn" data-act="dup" title="Duplicate" aria-label="Duplicate">' + icon('copy') + '</button>' +
      '<button type="button" class="iconbtn iconbtn--danger" data-act="del" title="Delete" aria-label="Delete">' + icon('trash') + '</button></span>' +
      '<svg class="chev"><use href="#a-down"/></svg>';
  }

  function itemFields(sec, it) { return sec.type === 'blocks' ? (BLOCK_FIELDS[it.type] || []) : sec.fields; }
  function itemInvalid(sec, it) {
    return itemFields(sec, it).some(function (f) { return f.req && emptyVal(it[f.k]); });
  }

  /* A list inside one item: table rows, documents, photos, dropdown links, footer links */
  function subListHTML(base, arr, label, type, title, fieldsFor) {
    var n = arr.length;
    var rows = arr.map(function (r, j) {
      return '<div class="subrow" data-j="' + j + '"><span class="subrow__num">' + (j + 1) + '</span>' +
        '<div class="subrow__fields subrow__fields--' + type + '">' + fieldsFor(r || {}, base + '.' + j) + '</div>' +
        '<div class="subrow__tools">' +
        '<button type="button" class="iconbtn" data-sub-act="up" data-sub="' + base + '" title="Move up" aria-label="Move up"' + (j === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
        '<button type="button" class="iconbtn" data-sub-act="down" data-sub="' + base + '" title="Move down" aria-label="Move down"' + (j === n - 1 ? ' disabled' : '') + '>' + icon('down') + '</button>' +
        '<button type="button" class="iconbtn iconbtn--danger" data-sub-act="del" data-sub="' + base + '" title="Delete" aria-label="Delete">' + icon('trash') + '</button></div></div>';
    }).join('');
    return '<div class="sub field--wide"><div class="sub__head"><b>' + (title ? esc(title) + ' · ' : '') + n + ' ' + label + (n === 1 ? '' : 's') + '</b>' +
      (n > 6 ? '<input type="search" class="sub__filter" placeholder="Find a ' + label + '…" aria-label="Find a ' + label + '">' : '') +
      '<button type="button" class="btn btn--ghost btn--sm" data-sub-add="' + base + '" data-sub-type="' + type + '">' + icon('plus') + ' Add ' + label + '</button></div>' +
      '<div class="sub__list">' + (rows || '<p class="muted sub__empty">No ' + label + 's yet.</p>') + '</div>' +
      (n > 4 ? '<button type="button" class="add add--sm" data-sub-add="' + base + '" data-sub-type="' + type + '">' + icon('plus') + ' Add ' + label + ' at the end</button>' : '') + '</div>';
  }
  function subFieldsFor(type) {
    return function (r, rb) { return (SUB_FIELDS[type] || []).map(function (f) { return fieldHTML(f, r[f.k], rb + '.' + f.k); }).join(''); };
  }
  /* Rows of a table / documents of a list / photos of a gallery, inside one block */
  function subHTML(b, i) {
    var bt = BLOCK_TYPES[b.type];
    if (!bt.sub) return '';
    var fieldsFor = b.type === 'table' ? function (r, rb) {
      return (b.columns || []).map(function (c, k) {
        return fieldHTML({ l: c || 'Column ' + (k + 1), t: 'textarea', rows: k === 0 ? 2 : 3 }, (r.cells || [])[k], rb + '.cells.' + k);
      }).join('');
    } : subFieldsFor(b.type);
    return subListHTML('blocks.' + i + '.' + bt.sub, b[bt.sub] || [], bt.subLabel, b.type, '', fieldsFor);
  }

  function renderEditor() {
    var sec = SEC[S.sec], ed = $('#editor');
    $('#section-title').textContent = sec.title;
    $('#section-desc').textContent = sec.desc;

    if (sec.type === 'object') {
      ed.innerHTML = sec.groups.map(function (g) {
        return '<div class="panel">' + (g.h ? '<h3>' + esc(g.h) + '</h3>' : '') + g.fields.map(function (f) {
          var path = (sec.path ? sec.path + '.' : '') + f.k;
          return fieldHTML(f, getPath(S.data, path), path);
        }).join('') + '</div>';
      }).join('');
      return;
    }

    if (sec.type === 'blocks') {
      var blocks = list(sec), bn = blocks.length;
      ed.innerHTML = '<div class="ed-head"><p class="muted">' + bn + ' block' + (bn === 1 ? '' : 's') + (bn > 1 ? ' · drag to reorder' : '') + '</p>' +
        '<a class="btn btn--ghost btn--sm" href="' + esc(liveUrl()) + '" target="_blank" rel="noopener">' + icon('ext') + ' Open live page</a></div>' +
        '<div class="items" id="items">' + (bn ? blocks.map(function (b, i) {
          var open = S.open[sec.id + ':' + i], bt = BLOCK_TYPES[b.type] || BLOCK_TYPES.text;
          var bad = S.showErrors && itemInvalid(sec, b);
          return '<div class="item item--block' + (open ? ' is-open' : '') + (bad ? ' is-invalid' : '') + '" data-i="' + i + '">' +
            '<div class="item__head" data-toggle>' + headHTML(sec, b, i, bn) + '</div>' +
            '<div class="item__body"><p class="muted field--wide block-hint">' + esc(bt.hint) + '</p>' +
            (BLOCK_FIELDS[b.type] || []).map(function (f) { return fieldHTML(f, b[f.k], 'blocks.' + i + '.' + f.k); }).join('') +
            subHTML(b, i) + '</div></div>';
        }).join('') : '<div class="empty">This page has no content yet. Add a block below.</div>') + '</div>' +
        '<div class="addbar"><span>Add a block</span>' + Object.keys(BLOCK_TYPES).map(function (k) {
          return '<button type="button" class="btn btn--ghost btn--sm" data-add-block="' + k + '">' + icon(BLOCK_TYPES[k].icon) + ' ' + esc(BLOCK_TYPES[k].label) + '</button>';
        }).join('') + '</div>';
      return;
    }

    var items = list(sec), n = items.length;
    var canAdd = !sec.max || n < sec.max;
    ed.innerHTML =
      '<div class="ed-head"><p class="muted">' + n + ' ' + esc(sec.item) + (n === 1 ? '' : 's') + (n > 1 ? ' · drag to reorder, the order here is the order on the site' : '') + '</p>' +
      (n > 3 ? '<button type="button" class="btn btn--ghost btn--sm" data-collapse>' + (Object.keys(S.open).some(function (k) { return k.indexOf(sec.id + ':') === 0 && S.open[k]; }) ? 'Collapse all' : 'Expand all') + '</button>' : '') + '</div>' +
      '<div class="items" id="items">' + (n ? items.map(function (it, i) {
        var open = S.open[sec.id + ':' + i];
        var bad = S.showErrors && itemInvalid(sec, it);
        return '<div class="item' + (open ? ' is-open' : '') + (bad ? ' is-invalid' : '') + '" data-i="' + i + '">' +
          '<div class="item__head" data-toggle>' + headHTML(sec, it, i, n) + '</div>' +
          '<div class="item__body">' + sec.fields.map(function (f) {
            return fieldHTML(f, it[f.k], sec.path + '.' + i + '.' + f.k);
          }).join('') + '</div></div>';
      }).join('') : '<div class="empty">Nothing here yet.' + (sec.id === 'upcoming' ? ' The site shows "Coming soon" in this tab.' : '') + '</div>') + '</div>' +
      (canAdd ? '<button type="button" class="add" data-add>' + icon('plus') + ' Add ' + esc(sec.item) + '</button>' : '<p class="muted">Maximum of ' + sec.max + ' ' + esc(sec.item) + 's.</p>');
  }

  function render() { renderNav(); renderEditor(); updateStatus(); }

  /* ---------------- Helpers ---------------- */
  function resolve(v) {
    if (!v) return '#';
    if (/^(https?:|data:|mailto:|tel:)/i.test(v)) return v;
    try { return new URL(String(v).replace(/^\//, ''), location.origin + '/').href; } catch (e) { return v; }
  }
  function isOldServer(v) { return /cmchbhopal\.com/i.test(String(v || '')) && !/^mailto:/i.test(String(v || '')); }
  function ytId(v) {
    v = String(v || '').trim();
    var m = v.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(v) ? v : '';
  }
  function slug(s) { return String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'file'; }
  function newItem(sec) {
    var o = {};
    sec.fields.forEach(function (f) { o[f.k] = f.t === 'check' ? false : f.t === 'select' ? f.opts[0][0] : f.t === 'sublist' ? [] : ''; });
    return o;
  }

  /* ---------------- Uploads ---------------- */
  function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var max = 2000, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (sc === 1 && file.size < 600 * 1024) return file;
      var c = document.createElement('canvas');
      c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, 'image/webp', 0.85); }).then(function (blob) {
        return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file;
      });
    }).catch(function () { return file; });
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept;
      inp.onchange = function () { resolve(inp.files[0] || null); };
      inp.click();
    });
  }

  function upload(file, path, holder) {
    if (!file) return;
    if (S.mode !== 'supabase') {
      toast('Uploading needs Supabase. In draft mode, paste a link or a path like images/photo.jpg.', 'error');
      return;
    }
    var isImg = /^image\//.test(file.type), isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isImg && !isPdf) { toast('Only photos (JPG, PNG, WebP, SVG) and PDF files can be uploaded.', 'error'); return; }
    if (file.size > 25 * 1024 * 1024) { toast('File is larger than 25 MB. Please compress it first.', 'error'); return; }
    var bar = holder && $('.progress', holder), fill = bar && $('i', bar);
    if (bar) { bar.hidden = false; fill.style.width = '15%'; }
    var tick = setInterval(function () { if (fill) fill.style.width = Math.min(90, parseFloat(fill.style.width) + 7) + '%'; }, 250);
    return compress(file).then(function (f) {
      var ext = (f.name.match(/\.([a-z0-9]+)$/i) || [, isPdf ? 'pdf' : 'jpg'])[1].toLowerCase();
      var name = (isHome() ? 'home' : 'pages/' + docSlug()) + '/' + (isPdf ? 'docs/' : '') + Date.now() + '-' + slug(f.name) + '.' + ext;
      return S.sb.storage.from(BUCKET).upload(name, f, { cacheControl: '31536000', upsert: false, contentType: f.type || undefined }).then(function (r) {
        if (r.error) throw r.error;
        return S.sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
      });
    }).then(function (url) {
      clearInterval(tick);
      if (fill) fill.style.width = '100%';
      setValue(path, url, 'image');
      renderEditor();
      changed();
      toast(isPdf ? 'PDF uploaded.' : 'Photo uploaded.');
    }).catch(function (e) {
      clearInterval(tick);
      if (bar) bar.hidden = true;
      toast('Upload failed: ' + (e.message || e), 'error');
    });
  }

  /* When a real photo replaces a demo one, drop the demo flag */
  function setValue(path, val, t) {
    setPath(S.data, path, val);
    if (t === 'image') {
      var parentPath = path.split('.').slice(0, -1).join('.');
      var parent = parentPath ? getPath(S.data, parentPath) : null;
      if (parent && !Array.isArray(parent) && parent.demo) delete parent.demo;
    }
  }

  /* ---------------- Editor events ---------------- */
  function onInput(e) {
    var el = e.target, path = el.dataset.path;
    if (!path) return;
    var t = el.dataset.t, v;
    if (t === 'check') v = el.checked;
    else if (t === 'number') v = el.value === '' ? 0 : Number(el.value);
    else if (t === 'csv') v = el.value.split('|').map(function (x) { return x.trim(); });
    else v = el.value;
    // 'change' fires on blur. Re-rendering then would swap out the button the
    // user is clicking, so only YouTube links (normalised to an ID) and
    // checkboxes/selects (which have no 'input' on some browsers) go further.
    if (e.type === 'change') {
      if (t === 'youtube') { v = ytId(v) || v.trim(); if (el.value !== v) el.value = v; else return; }
      else if (t !== 'check' && t !== 'select') return;
    }
    setValue(path, v, t);

    var field = el.closest('.field');
    if (field && S.showErrors) field.classList.toggle('is-invalid', false);
    if (t === 'image') {
      var prev = field && $('.media__prev', field);
      if (prev) prev.innerHTML = v ? '<img src="' + esc(resolve(v)) + '" alt="">' : icon('image');
    }
    if (t === 'youtube') {
      var th = field && $('[data-yt-thumb]', field), id = ytId(v);
      if (th) { th.style.visibility = id ? '' : 'hidden'; if (id) th.src = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'; }
    }
    if (t === 'link') {
      var a = field && $('[data-open-link]', field);
      if (a) a.href = resolve(v);
    }
    var item = el.closest('.item');
    if (item && !el.closest('.subrow')) {
      var sec = SEC[S.sec], i = +item.dataset.i, items = list(sec);
      $('.item__head', item).innerHTML = headHTML(sec, items[i], i, items.length);
    }
    changed();
  }

  function onFilter(e) {
    var inp = e.target;
    if (!inp.classList.contains('sub__filter')) return false;
    var q = inp.value.trim().toLowerCase();
    $$('.subrow', inp.closest('.sub')).forEach(function (r) {
      var txt = $$('input,textarea', r).map(function (x) { return x.value; }).join(' ').toLowerCase();
      r.hidden = q && txt.indexOf(q) < 0;
    });
    return true;
  }

  function moveItem(sec, from, to) {
    var items = list(sec);
    if (to < 0 || to >= items.length || from === to) return;
    var it = items.splice(from, 1)[0];
    items.splice(to, 0, it);
    var oa = S.open[sec.id + ':' + from], ob = S.open[sec.id + ':' + to];
    // keep the moved item's open state with it
    var next = {};
    Object.keys(S.open).forEach(function (k) { if (k.indexOf(sec.id + ':') !== 0) next[k] = S.open[k]; });
    if (oa) next[sec.id + ':' + to] = true;
    S.open = next;
    void ob;
    renderEditor(); changed();
  }

  function onClick(e) {
    var t = e.target;
    var sec = SEC[S.sec];

    // blocks: add a block of a type
    var ab = t.closest('[data-add-block]');
    if (ab) {
      var bl = list(sec);
      bl.push(newBlock(ab.dataset.addBlock));
      setPath(S.data, sec.path, bl);
      S.open[sec.id + ':' + (bl.length - 1)] = true;
      renderEditor(); changed();
      var lastB = $('.item:last-child', $('#items'));
      if (lastB) lastB.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // rows / documents / photos inside a block
    var sa = t.closest('[data-sub-add]');
    if (sa) {
      var arr = getPath(S.data, sa.dataset.subAdd) || [];
      var bi = +sa.dataset.subAdd.split('.')[1], blk = list(sec)[bi];
      var row = sa.dataset.subType === 'table' ? { cells: ((blk && blk.columns) || ['', '']).map(function () { return ''; }) } : newSubRow(sa.dataset.subType);
      var atTop = !sa.classList.contains('add');
      if (atTop && sa.dataset.subType !== 'table') arr.unshift(row); else arr.push(row);
      setPath(S.data, sa.dataset.subAdd, arr);
      renderEditor(); changed();
      var target = $$('.item[data-i="' + bi + '"] .subrow')[atTop && sa.dataset.subType !== 'table' ? 0 : arr.length - 1];
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); var fi = $('input,textarea', target); if (fi) setTimeout(function () { fi.focus(); }, 250); }
      return;
    }
    var sact = t.closest('[data-sub-act]');
    if (sact) {
      var sarr = getPath(S.data, sact.dataset.sub) || [], j = +sact.closest('.subrow').dataset.j;
      if (sact.dataset.subAct === 'up' && j > 0) { sarr.splice(j - 1, 0, sarr.splice(j, 1)[0]); renderEditor(); changed(); }
      else if (sact.dataset.subAct === 'down' && j < sarr.length - 1) { sarr.splice(j + 1, 0, sarr.splice(j, 1)[0]); renderEditor(); changed(); }
      else if (sact.dataset.subAct === 'del') {
        confirmDialog({ title: 'Delete this entry?', text: 'It will be removed from the page when you publish.' }).then(function (ok) {
          if (!ok) return;
          sarr.splice(j, 1); renderEditor(); changed();
        });
      }
      return;
    }

    var up = t.closest('[data-upload]');
    if (up) {
      var holder = up.closest('.field');
      pickFile(up.dataset.accept).then(function (f) { upload(f, up.dataset.upload, holder); });
      return;
    }
    var clr = t.closest('[data-clear]');
    if (clr) { setValue(clr.dataset.clear, '', 'image'); renderEditor(); changed(); return; }

    if (t.closest('[data-add]')) {
      var items = list(sec);
      items.push(newItem(sec));
      setPath(S.data, sec.path, items);
      S.open[sec.id + ':' + (items.length - 1)] = true;
      renderEditor(); changed();
      var last = $('.item:last-child', $('#items'));
      if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); var inp = $('input,textarea', $('.item__body', last)); if (inp) setTimeout(function () { inp.focus(); }, 300); }
      return;
    }
    if (t.closest('[data-collapse]')) {
      var anyOpen = Object.keys(S.open).some(function (k) { return k.indexOf(sec.id + ':') === 0 && S.open[k]; });
      list(sec).forEach(function (_, i) { S.open[sec.id + ':' + i] = !anyOpen; });
      renderEditor();
      return;
    }

    var act = t.closest('[data-act]');
    if (act) {
      e.stopPropagation();
      var i = +act.closest('.item').dataset.i, its = list(sec);
      if (act.dataset.act === 'up') moveItem(sec, i, i - 1);
      else if (act.dataset.act === 'down') moveItem(sec, i, i + 1);
      else if (act.dataset.act === 'dup') {
        if (sec.max && its.length >= sec.max) { toast('Maximum of ' + sec.max + ' ' + sec.item + 's.', 'error'); return; }
        its.splice(i + 1, 0, clone(its[i]));
        S.open[sec.id + ':' + (i + 1)] = true;
        renderEditor(); changed();
      } else if (act.dataset.act === 'del') {
        var name = (sec.type === 'blocks' ? (its[i].title || its[i].label) : its[i][sec.titleKey]) || ('this ' + sec.item);
        confirmDialog({ title: 'Delete ' + sec.item + '?', text: '"' + String(name).slice(0, 80) + '" will be removed from the site when you publish.' }).then(function (ok) {
          if (!ok) return;
          its.splice(i, 1);
          S.open = {};
          renderEditor(); changed();
          toast('Deleted. Publish to update the site.');
        });
      }
      return;
    }

    var head = t.closest('[data-toggle]');
    if (head && !t.closest('[data-handle]')) {
      var item = head.closest('.item'), key = sec.id + ':' + item.dataset.i;
      S.open[key] = !S.open[key];
      item.classList.toggle('is-open', S.open[key]);
    }
  }

  function initDnD() {
    var ed = $('#editor');
    ed.addEventListener('mousedown', function (e) {
      var h = e.target.closest('[data-handle]');
      if (h) h.closest('.item').draggable = true;
    });
    ed.addEventListener('dragstart', function (e) {
      var item = e.target.closest && e.target.closest('.item');
      if (!item || !item.draggable) return;
      S.drag = +item.dataset.i;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(S.drag)); } catch (x) { /* IE */ }
    });
    ed.addEventListener('dragover', function (e) {
      var prev = e.target.closest && e.target.closest('[data-drop]');
      if (prev && e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') > -1) {
        e.preventDefault(); prev.classList.add('is-drop'); return;
      }
      if (S.drag == null) return;
      var item = e.target.closest && e.target.closest('.item');
      if (!item) return;
      e.preventDefault();
      $$('.item.is-over', ed).forEach(function (x) { if (x !== item) x.classList.remove('is-over'); });
      item.classList.add('is-over');
    });
    ed.addEventListener('dragleave', function (e) {
      var prev = e.target.closest && e.target.closest('[data-drop]');
      if (prev) prev.classList.remove('is-drop');
    });
    ed.addEventListener('drop', function (e) {
      var prev = e.target.closest && e.target.closest('[data-drop]');
      if (prev && e.dataTransfer.files && e.dataTransfer.files.length) {
        e.preventDefault(); prev.classList.remove('is-drop');
        upload(e.dataTransfer.files[0], prev.dataset.drop, prev.closest('.field'));
        return;
      }
      var item = e.target.closest && e.target.closest('.item');
      if (S.drag == null || !item) return;
      e.preventDefault();
      var to = +item.dataset.i, from = S.drag;
      S.drag = null;
      moveItem(SEC[S.sec], from, to);
    });
    ed.addEventListener('dragend', function () {
      S.drag = null;
      $$('.item', ed).forEach(function (x) { x.draggable = false; x.classList.remove('is-dragging', 'is-over'); });
    });
  }

  /* ---------------- Validation & publish ---------------- */
  function validate() {
    if (!isHome() && emptyVal(S.data.title)) return { sec: SEC.details, i: 0, msg: 'Page title is required.' };
    for (var s = 0; s < SECTIONS.length; s++) {
      var sec = SECTIONS[s];
      if (sec.type === 'object') continue;
      var items = list(sec);
      for (var i = 0; i < items.length; i++) {
        var flds = itemFields(sec, items[i]);
        for (var f = 0; f < flds.length; f++) {
          var fd = flds[f];
          if (fd.req && emptyVal(items[i][fd.k])) return { sec: sec, i: i, msg: sec.title + ' #' + (i + 1) + ': "' + fd.l + '" is required.' };
        }
      }
    }
    return null;
  }

  function publish() {
    var bad = validate();
    if (bad) {
      S.showErrors = true;
      S.sec = bad.sec.id;
      S.open[bad.sec.id + ':' + bad.i] = true;
      render();
      var el = $('.item.is-invalid');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(bad.msg, 'error');
      return;
    }
    S.showErrors = false;

    if (S.mode === 'draft') { download(); return; }

    var btn = $('#btn-save');
    btn.classList.add('is-busy');
    $('span', btn).textContent = 'Publishing…';
    if (!isHome()) {
      var d = new Date();
      S.data.updated = ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear();
    }
    S.sb.from('site_content').upsert({
      key: DOC, data: S.data, updated_by: S.user.email, updated_at: new Date().toISOString()
    }).then(function (r) {
      if (!r.error && !isHome()) registerPage(docSlug(), S.data.title);
      btn.classList.remove('is-busy');
      $('span', btn).textContent = 'Publish';
      if (r.error) { toast('Publish failed: ' + r.error.message, 'error'); return; }
      S.saved = JSON.stringify(S.data);
      S.meta = { updated_at: new Date().toISOString(), updated_by: S.user.email };
      try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ }
      writeDraft();
      render();
      toast('Published. The live site now shows these changes.');
    });
  }

  function download() {
    var blob = new Blob([JSON.stringify(S.data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var fname = isHome() ? 'home.json' : docSlug().replace(/\//g, '--') + '.json';
    a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast(fname + ' downloaded. Put it in ' + (isHome() ? 'content/' : 'content/pages/') + ' in the repo.');
  }

  /* ---------------- History ---------------- */
  function openHistory() {
    var d = $('#history'), listEl = $('#history-list');
    d.hidden = false;
    listEl.innerHTML = '<p class="muted">Loading…</p>';
    S.sb.from('site_content_history').select('id,saved_at,saved_by').eq('key', DOC).order('saved_at', { ascending: false }).limit(40).then(function (r) {
      if (r.error) { listEl.innerHTML = '<p class="form-error">' + esc(r.error.message) + '</p>'; return; }
      var live = S.meta ? '<div class="hrow"><div><b>Live now</b><small>' + fmt(S.meta.updated_at) + (S.meta.updated_by ? ' · ' + esc(S.meta.updated_by) : '') + '</small></div></div>' : '';
      listEl.innerHTML = live + (r.data.length ? r.data.map(function (h) {
        return '<div class="hrow"><div><b>' + fmt(h.saved_at) + '</b><small>Replaced by a newer publish' + (h.saved_by ? ' · version by ' + esc(h.saved_by) : '') + '</small></div>' +
          '<button class="btn btn--ghost btn--sm" data-restore="' + h.id + '">Restore</button></div>';
      }).join('') : '<p class="muted">No older versions yet. They appear after the second publish.</p>');
    });
  }
  function fmt(iso) {
    try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; }
  }
  function restore(id) {
    S.sb.from('site_content_history').select('data').eq('id', id).single().then(function (r) {
      if (r.error) { toast(r.error.message, 'error'); return; }
      S.data = normalize(r.data.data);
      S.open = {};
      $('#history').hidden = true;
      render(); changed();
      toast('Older version loaded. Check it, then Publish to make it live.');
    });
  }

  /* ---------------- App start ---------------- */
  function fetchFile() {
    return fetch(fileUrl(), { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(fileUrl().replace('../', '') + ': HTTP ' + r.status);
      return r.json();
    });
  }

  var started = false;
  function startApp() {
    show('app');
    var name = S.mode === 'draft' ? 'Draft mode' : (S.user.email || '');
    $('[data-user-name]').textContent = name;
    $('[data-avatar]').textContent = (name || '?').charAt(0).toUpperCase();
    $('[data-mode-label]').textContent = S.mode === 'draft' ? 'Not connected' : 'Admin';
    $('#draft-note').hidden = S.mode !== 'draft';
    $('#btn-history').hidden = S.mode !== 'supabase';
    $('#btn-download').hidden = S.mode !== 'supabase';
    var save = $('#btn-save');
    if (S.mode === 'draft') { save.innerHTML = icon('dl') + ' <span>Download JSON</span>'; }
    if (started) return;
    started = true;

    $('#doc-select').addEventListener('change', function (e) {
      var v = e.target.value;
      if (v === '__new') { e.target.value = DOC; newPage(); return; }
      switchDoc(v, function () { e.target.value = DOC; });
    });
    $('#btn-new-page').addEventListener('click', newPage);

    $('#side-nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sec]');
      if (!b) return;
      S.sec = b.dataset.sec;
      render();
      window.scrollTo(0, 0);
    });
    var ed = $('#editor');
    ed.addEventListener('input', function (e) { if (!onFilter(e)) onInput(e); });
    ed.addEventListener('change', onInput);
    ed.addEventListener('click', onClick);
    ed.addEventListener('keydown', function (e) {
      var h = e.target.closest('[data-toggle]');
      if (h && (e.key === 'Enter' || e.key === ' ') && e.target === h) { e.preventDefault(); h.click(); }
    });
    initDnD();

    save.addEventListener('click', publish);
    $('#btn-download').addEventListener('click', download);
    $('#btn-preview').addEventListener('click', writeDraft);
    $('#btn-history').addEventListener('click', openHistory);
    $('#history').addEventListener('click', function (e) {
      if (e.target.id === 'history' || e.target.closest('[data-close]')) $('#history').hidden = true;
      var r = e.target.closest('[data-restore]');
      if (r) restore(+r.dataset.restore);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); publish(); }
      if (e.key === 'Escape' && !$('#history').hidden) $('#history').hidden = true;
    });
    window.addEventListener('beforeunload', function (e) {
      if (S.mode === 'supabase' && isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ---------------- Pages registry + switching documents ---------------- */
  S.registry = [];
  function loadRegistry() {
    var fromFile = fetch('../content/pages/index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : { pages: [] }; }).catch(function () { return { pages: [] }; });
    var fromDb = S.mode === 'supabase' ? S.sb.from('site_content').select('data').eq('key', 'pages').maybeSingle().then(function (r) { return (r.data && r.data.data) || { pages: [] }; }, function () { return { pages: [] }; }) : Promise.resolve({ pages: [] });
    var local = { pages: [] };
    try { local = JSON.parse(localStorage.getItem('cmch_admin_pages') || '{"pages":[]}'); } catch (e) { /* ignore */ }
    return Promise.all([fromFile, fromDb]).then(function (res) {
      var map = {};
      [res[0], res[1], S.mode === 'draft' ? local : { pages: [] }].forEach(function (src) {
        (src.pages || []).forEach(function (p) { if (p && p.slug) map[p.slug] = { slug: p.slug, title: p.title || p.slug }; });
      });
      S.registry = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.title.localeCompare(b.title); });
      renderDocSelect();
    });
  }
  function renderDocSelect() {
    var sel = $('#doc-select');
    sel.innerHTML = '<option value="home">Homepage</option><optgroup label="Pages">' +
      S.registry.map(function (p) { return '<option value="page:' + esc(p.slug) + '">' + esc(p.title) + '</option>'; }).join('') +
      '</optgroup><option value="__new">+ New page…</option>';
    sel.value = DOC;
  }
  function registerPage(slugv, title) {
    var ex = S.registry.filter(function (p) { return p.slug === slugv; })[0];
    if (ex && ex.title === title) return Promise.resolve();
    if (ex) ex.title = title; else S.registry.push({ slug: slugv, title: title || slugv });
    S.registry.sort(function (a, b) { return a.title.localeCompare(b.title); });
    renderDocSelect();
    var data = { pages: S.registry };
    if (S.mode === 'supabase') {
      return S.sb.from('site_content').upsert({ key: 'pages', data: data, updated_by: S.user.email, updated_at: new Date().toISOString() }).then(function (r) {
        if (r.error) toast('Page list not saved: ' + r.error.message, 'error');
      });
    }
    try { localStorage.setItem('cmch_admin_pages', JSON.stringify(data)); } catch (e) { /* ignore */ }
    return Promise.resolve();
  }
  function liveUrl() { return isHome() ? '../' : '../' + docSlug() + '/'; }
  function previewUrl() { return isHome() ? '../?preview=draft' : '../page.html?p=' + encodeURIComponent(docSlug()) + '&preview=draft'; }
  function blankPage(title) { return normalizePage({ title: title || '', kicker: '', intro: '', updated: '', updatedBy: 'CMCH Admin', banner: '', blocks: [] }); }

  function loadDoc(doc) {
    DOC = doc;
    SECTIONS = isHome() ? HOME_SECTIONS : PAGE_SECTIONS;
    indexSections();
    S.sec = SECTIONS[0].id; S.open = {}; S.showErrors = false; S.meta = null;
    $('#side-nav').innerHTML = '';
    $('#btn-preview').href = previewUrl();
    var dsel = $('#doc-select'); if (dsel) dsel.value = DOC;
    var regTitle = (S.registry.filter(function (p) { return 'page:' + p.slug === doc; })[0] || {}).title;
    var draft = null;
    try { draft = localStorage.getItem(draftKey()); } catch (e) { /* ignore */ }

    var fromFile = function () { return fetchFile().catch(function () { return isHome() ? Promise.reject(new Error('content/home.json missing')) : blankPage(regTitle); }); };

    if (S.mode === 'draft') {
      return fromFile().then(function (file) {
        S.saved = JSON.stringify(normalize(clone(file)));
        var d = null;
        try { d = JSON.parse(draft || 'null'); } catch (e) { d = null; }
        S.data = normalize(d || file);
        writeDraft(); render();
      });
    }
    return S.sb.from('site_content').select('data,updated_at,updated_by').eq('key', DOC).maybeSingle().then(function (row) {
      if (row.error) throw row.error;
      return (row.data ? Promise.resolve(row.data.data) : fromFile()).then(function (content) {
        var missing = isHome() && row.data ? ['menu', 'footerCols', 'contact'].filter(function (k) { return content[k] == null; }) : [];
        if (!missing.length) return content;
        return fetchFile().then(function (f) { missing.forEach(function (k) { content[k] = f[k]; }); return content; }).catch(function () { return content; });
      }).then(function (content) {
        S.meta = row.data ? { updated_at: row.data.updated_at, updated_by: row.data.updated_by } : null;
        S.data = normalize(clone(content));
        S.saved = row.data ? JSON.stringify(S.data) : '';
        render();
        if (!row.data) toast('Not in Supabase yet: content was loaded from the repo. Publish once to store it.');
        else if (draft && draft !== S.saved && draft !== JSON.stringify(row.data.data)) {
          confirmDialog({ title: 'Restore unpublished changes?', text: 'This browser has changes to this page that were never published. Restore them, or start from the live version?', yes: 'Restore', no: 'Use live version', danger: false }).then(function (ok) {
            if (ok) { S.data = normalize(JSON.parse(draft)); render(); }
            changed();
          });
        } else writeDraft();
      });
    });
  }
  function switchDoc(doc, onCancel) {
    if (doc === DOC) return;
    var go = function () { loadDoc(doc).catch(function (e) { toast('Could not open: ' + (e.message || e), 'error'); }); window.scrollTo(0, 0); };
    if (S.mode === 'supabase' && isDirty()) {
      confirmDialog({ title: 'Leave without publishing?', text: 'Your changes stay saved in this browser and can be restored when you come back.', yes: 'Switch page', no: 'Stay here', danger: false }).then(function (ok) {
        if (ok) go(); else if (onCancel) onCancel();
      });
    } else go();
  }
  function newPage() {
    var title = window.prompt('Title of the new page (e.g. Anti Ragging Committee)');
    if (!title || !title.trim()) return;
    var addr = window.prompt('Page address — it opens at /<address>/ on the website.\nUse the same address as the old site so menu links keep working (folders are fine, e.g. student-info/teaching-schedule).', slug(title));
    if (addr == null) return;
    addr = String(addr).trim().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(\/[A-Za-z0-9][A-Za-z0-9_-]*)*$/.test(addr) || RESERVED.indexOf(addr.split('/')[0].toLowerCase()) > -1) { toast('Use only letters, numbers, dashes and / (and not starting with ' + RESERVED.join(', ') + ').', 'error'); return; }
    if (S.registry.some(function (p) { return p.slug === addr; })) { toast('That page already exists. It is now open.'); switchDoc('page:' + addr); return; }
    registerPage(addr, title.trim()).then(function () {
      switchDoc('page:' + addr);
    });
  }

  function enterDraftMode() {
    S.mode = 'draft';
    startApp();
    loadRegistry().then(function () { return loadDoc('home'); })
      .catch(function (e) { toast('Could not load content: ' + e.message, 'error'); });
  }

  function enterSupabase(user) {
    S.user = user;
    S.sb.from('site_admins').select('email').limit(1).then(function (r) {
      if (r.error || !r.data || !r.data.length) {
        $('[data-denied-email]').textContent = user.email;
        show('denied');
        return;
      }
      S.mode = 'supabase';
      startApp();
      return loadRegistry().then(function () { return loadDoc('home'); });
    }).catch(function (e) { toast('Could not load: ' + (e.message || e), 'error'); });
  }

  function formError(form, msg) {
    var p = $('.form-error', form);
    p.textContent = msg || '';
    p.hidden = !msg;
  }

  function boot() {
    $$('[data-signout]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.mode === 'supabase' && isDirty() && !window.confirm('You have unpublished changes. Sign out anyway?')) return;
        if (S.sb) S.sb.auth.signOut().then(function () { location.reload(); });
        else location.reload();
      });
    });

    var configured = CFG.supabaseUrl && CFG.supabaseAnonKey;
    if (!configured || !window.supabase) {
      if (configured && !window.supabase) toast('Could not load the Supabase library. Check the internet connection.', 'error');
      show('setup');
      $('#btn-draft-mode').addEventListener('click', enterDraftMode);
      return;
    }

    S.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    var recovering = /type=recovery/.test(location.hash);

    S.sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'PASSWORD_RECOVERY') { recovering = true; show('recover'); }
    });

    $('#form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = $('button[type=submit]', f);
      formError(f, '');
      if (!f.email.value || !f.password.value) { formError(f, 'Enter your email and password.'); return; }
      btn.classList.add('is-busy'); btn.textContent = 'Signing in…';
      S.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        btn.classList.remove('is-busy'); btn.textContent = 'Sign in';
        if (r.error) {
          var m = r.error.message || '';
          if (m === 'Invalid login credentials') m = 'Email or password is wrong.';
          else if (m === 'Email not confirmed') m = 'This email is not confirmed yet. In Supabase → Authentication → Users, confirm the user.';
          else if (!m || m === '{}' || /fetch|network/i.test(m)) m = 'Could not reach the login server. Check the internet connection and try again.';
          formError(f, m); return;
        }
        enterSupabase(r.data.user);
      });
    });
    $('#btn-forgot').addEventListener('click', function () {
      var f = $('#form-login'), email = f.email.value.trim();
      if (!email) { formError(f, 'Type your email above first, then click "Forgot password?".'); f.email.focus(); return; }
      S.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (r) {
        if (r.error) formError(f, r.error.message);
        else { formError(f, ''); toast('Password reset link sent to ' + email + '.'); }
      });
    });
    $('#form-recover').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (f.password.value.length < 8) { formError(f, 'Use at least 8 characters.'); return; }
      S.sb.auth.updateUser({ password: f.password.value }).then(function (r) {
        if (r.error) { formError(f, r.error.message); return; }
        history.replaceState(null, '', location.pathname);
        toast('Password updated.');
        enterSupabase(r.data.user);
      });
    });

    S.sb.auth.getSession().then(function (r) {
      var session = r.data && r.data.session;
      if (recovering) { show('recover'); return; }
      if (session) enterSupabase(session.user);
      else show('login');
    });
  }

  boot();
})();
