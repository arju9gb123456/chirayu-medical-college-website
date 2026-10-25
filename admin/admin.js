/* =========================================================
   CMCH Website — Admin panel
   Saves to Supabase table site_content (key = 'home').
   Without Supabase config it runs in draft mode (browser only).
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.CMCH_CONFIG || {};
  var PAGE = 'home';
  var DRAFT_KEY = 'cmch_admin_draft_home';
  var BUCKET = CFG.storageBucket || 'site-media';
  var FILE_URL = '../content/home.json';

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

  var SECTIONS = [
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
    { id: 'settings', path: '', title: 'Visitor counter', icon: 'users', type: 'object',
      desc: 'Starting number for the visitor counter in the footer.',
      groups: [{ h: '', fields: [{ k: 'visitorBase', l: 'Visitor count', t: 'number' }] }] }
  ];
  var SEC = {}; SECTIONS.forEach(function (s) { SEC[s.id] = s; });

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
    var a = sec.path ? getPath(S.data, sec.path) : S.data.visitorBase;
    var b = sec.path ? getPath(saved, sec.path) : saved.visitorBase;
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  function normalize(c) {
    c = c || {};
    c.hero = c.hero || {};
    ['slides', 'facts'].forEach(function (k) { if (!Array.isArray(c.hero[k])) c.hero[k] = []; });
    ['ticker', 'notices', 'media', 'upcomingEvents', 'studentInfo', 'videos', 'news', 'gallery'].forEach(function (k) {
      if (!Array.isArray(c[k])) c[k] = [];
    });
    c.blocks = c.blocks || {};
    if (typeof c.visitorBase !== 'number') c.visitorBase = parseInt(c.visitorBase, 10) || 0;
    return c;
  }

  function writeDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S.data)); } catch (e) { /* storage blocked */ }
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
        return '<label class="field' + wide + invalid + '">' + label + '<textarea id="' + id + '" data-path="' + path + '" data-t="textarea" rows="3">' + esc(val) + '</textarea>' + hint + '</label>';
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
          '<div class="progress" hidden><i></i></div>' + hint + '</div>';
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
    if (sec.imgKey) thumb = it[sec.imgKey] ? '<img class="item__thumb" src="' + esc(resolve(it[sec.imgKey])) + '" alt="">' : '<span class="item__thumb"></span>';
    if (sec.ytKey && ytId(it[sec.ytKey])) thumb = '<img class="item__thumb" src="https://i.ytimg.com/vi/' + esc(ytId(it[sec.ytKey])) + '/default.jpg" alt="">';
    var badges = (it.demo ? '<span class="badge" title="Temporary web image, replace with a real photo">Demo photo</span>' : '') +
      (sec.newKey && it[sec.newKey] ? '<span class="badge badge--new">NEW</span>' : '');
    return '<span class="handle" data-handle title="Drag to reorder">' + icon('drag') + '</span>' +
      '<span class="item__num">' + (i + 1) + '</span>' + thumb +
      '<span class="item__title">' + (title ? esc(title) : '<i class="muted">Untitled ' + esc(sec.item) + '</i>') + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + badges +
      '<span class="item__tools">' +
      '<button type="button" class="iconbtn" data-act="up" title="Move up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
      '<button type="button" class="iconbtn" data-act="down" title="Move down" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>' + icon('down') + '</button>' +
      '<button type="button" class="iconbtn" data-act="dup" title="Duplicate" aria-label="Duplicate">' + icon('copy') + '</button>' +
      '<button type="button" class="iconbtn iconbtn--danger" data-act="del" title="Delete" aria-label="Delete">' + icon('trash') + '</button></span>' +
      '<svg class="chev"><use href="#a-down"/></svg>';
  }

  function itemInvalid(sec, it) {
    return sec.fields.some(function (f) { return f.req && emptyVal(it[f.k]); });
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
  function ytId(v) {
    v = String(v || '').trim();
    var m = v.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(v) ? v : '';
  }
  function slug(s) { return String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'file'; }
  function newItem(sec) {
    var o = {};
    sec.fields.forEach(function (f) { o[f.k] = f.t === 'check' ? false : f.t === 'select' ? f.opts[0][0] : ''; });
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
      var name = PAGE + '/' + (isPdf ? 'docs/' : '') + Date.now() + '-' + slug(f.name) + '.' + ext;
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
    if (item) {
      var sec = SEC[S.sec], i = +item.dataset.i, items = list(sec);
      $('.item__head', item).innerHTML = headHTML(sec, items[i], i, items.length);
    }
    changed();
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
        var name = its[i][sec.titleKey] || ('this ' + sec.item);
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
    for (var s = 0; s < SECTIONS.length; s++) {
      var sec = SECTIONS[s];
      if (sec.type === 'object') continue;
      var items = list(sec);
      for (var i = 0; i < items.length; i++) {
        for (var f = 0; f < sec.fields.length; f++) {
          var fd = sec.fields[f];
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
    S.sb.from('site_content').upsert({
      key: PAGE, data: S.data, updated_by: S.user.email, updated_at: new Date().toISOString()
    }).then(function (r) {
      btn.classList.remove('is-busy');
      $('span', btn).textContent = 'Publish';
      if (r.error) { toast('Publish failed: ' + r.error.message, 'error'); return; }
      S.saved = JSON.stringify(S.data);
      S.meta = { updated_at: new Date().toISOString(), updated_by: S.user.email };
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
      writeDraft();
      render();
      toast('Published. The live site now shows these changes.');
    });
  }

  function download() {
    var blob = new Blob([JSON.stringify(S.data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'home.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('home.json downloaded. Replace content/home.json in the repo with it.');
  }

  /* ---------------- History ---------------- */
  function openHistory() {
    var d = $('#history'), listEl = $('#history-list');
    d.hidden = false;
    listEl.innerHTML = '<p class="muted">Loading…</p>';
    S.sb.from('site_content_history').select('id,saved_at,saved_by').eq('key', PAGE).order('saved_at', { ascending: false }).limit(40).then(function (r) {
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
    return fetch(FILE_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('content/home.json: HTTP ' + r.status);
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
    writeDraft();
    render();
    if (started) return;
    started = true;

    $('#side-nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sec]');
      if (!b) return;
      S.sec = b.dataset.sec;
      render();
      window.scrollTo(0, 0);
    });
    var ed = $('#editor');
    ed.addEventListener('input', onInput);
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

  function enterDraftMode() {
    S.mode = 'draft';
    fetchFile().then(function (file) {
      S.saved = JSON.stringify(normalize(clone(file)));
      var draft = null;
      try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { draft = null; }
      S.data = normalize(draft || file);
      startApp();
    }).catch(function (e) { toast('Could not load content: ' + e.message, 'error'); });
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
      return S.sb.from('site_content').select('data,updated_at,updated_by').eq('key', PAGE).maybeSingle().then(function (row) {
        if (row.error) throw row.error;
        var p = row.data ? Promise.resolve(row.data.data) : fetchFile();
        return p.then(function (content) {
          S.meta = row.data ? { updated_at: row.data.updated_at, updated_by: row.data.updated_by } : null;
          S.data = normalize(clone(content));
          S.saved = row.data ? JSON.stringify(S.data) : '';
          var draft = null;
          try { draft = localStorage.getItem(DRAFT_KEY); } catch (e) { /* ignore */ }
          startApp();
          if (!row.data) toast('First time here: content was loaded from content/home.json. Publish once to store it in Supabase.');
          else if (draft && draft !== S.saved && draft !== JSON.stringify(row.data.data)) {
            confirmDialog({ title: 'Restore unpublished changes?', text: 'This browser has changes that were never published. Restore them, or start from the live version?', yes: 'Restore', no: 'Use live version', danger: false }).then(function (ok) {
              if (ok) { S.data = normalize(JSON.parse(draft)); render(); }
              changed();
            });
          }
        });
      });
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
