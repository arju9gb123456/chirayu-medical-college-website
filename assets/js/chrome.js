/* =========================================================
   Chirayu Medical College & Hospital — site chrome
   Builds the top bar, main menu, mobile drawer and footer from the
   admin content (home record: menu, footerCols, contact).
   Used by the homepage (main.js) and every inner page (page.js).
   The HTML already contains the same menu, so the site works even
   before this runs; this only applies admin changes.
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 'about/' → '/about/', full links unchanged, empty → '#' */
  function url(h) {
    h = String(h || '').trim();
    if (!h || h === '#') return '#';
    if (/^(javascript|data|vbscript):/i.test(h)) return '#';
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(h)) return h;
    return '/' + h;
  }
  function isExternal(h) {
    h = String(h || '');
    return (/^https?:/i.test(h) && h.indexOf(location.host) < 0) || /\.pdf/i.test(h);
  }
  function a(item, cls) {
    var h = item.href;
    return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(url(h)) + '"' +
      (isExternal(h) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(item.label) + '</a>';
  }
  function chev() { return ' <svg><use href="#i-chev"/></svg>'; }
  function samePage(h) {
    var p = url(h).replace(/\/+$/, '') || '/';
    var here = location.pathname.replace(/\/+$/, '') || '/';
    return p === here || (p === '/' && /^\/(index\.html)?$/.test(location.pathname));
  }

  /* Split a dropdown into two columns: at the first heading, or in half when long */
  function columns(kids) {
    var hi = -1;
    kids.forEach(function (k, i) { if (k.heading && hi < 0 && i > 0) hi = i; });
    if (hi > 0) return [kids.slice(0, hi), kids.slice(hi)];
    if (kids.length > 6) { var m = Math.ceil(kids.length / 2); return [kids.slice(0, m), kids.slice(m)]; }
    return [kids];
  }
  function dropLinks(list) {
    return list.map(function (k) { return k.heading ? '<span class="drop__head">' + esc(k.label) + '</span>' : a(k); }).join('');
  }

  function renderMenu(menu) {
    var nav = $('.nav__list'), drawer = $('#drawer');
    if (!nav || !Array.isArray(menu) || !menu.length) return;
    var items = menu.filter(function (m) { return m && m.label; });

    nav.innerHTML = items.map(function (m, i) {
      var kids = (m.children || []).filter(function (k) { return k && k.label; });
      var cur = samePage(m.href) && m.href ? ' aria-current="page"' : '';
      var head = '<a class="nav__link" href="' + esc(url(m.href)) + '"' + cur + (isExternal(m.href) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(m.label) + (kids.length ? chev() : '') + '</a>';
      if (!kids.length) return '<li class="nav__item">' + head + '</li>';
      var cols = columns(kids);
      var right = i >= items.length - 2 ? ' drop--right' : '';
      var drop = cols.length > 1
        ? '<div class="drop drop--mega' + right + '">' + cols.map(function (c) { return '<div class="drop__col">' + dropLinks(c) + '</div>'; }).join('') + '</div>'
        : '<div class="drop' + right + '">' + dropLinks(kids) + '</div>';
      return '<li class="nav__item">' + head + drop + '</li>';
    }).join('');
    $$('.drop', nav).forEach(function (d) { $$('a, .drop__head', d).forEach(function (x, k) { x.style.setProperty('--n', k); }); });

    if (drawer) {
      var cta = $('.drawer__cta', drawer);
      $$('details, .drawer__link', drawer).forEach(function (el) { el.remove(); });
      var html = items.map(function (m) {
        var kids = (m.children || []).filter(function (k) { return k && k.label; });
        if (!kids.length) return a(m, 'drawer__link');
        var first = m.href && m.href !== '#' ? a(m) : '';
        return '<details><summary>' + esc(m.label) + '</summary><div class="drawer__sub">' + first +
          kids.map(function (k) { return k.heading ? '<h5>' + esc(k.label) + '</h5>' : a(k); }).join('') + '</div></details>';
      }).join('');
      if (cta) cta.insertAdjacentHTML('beforebegin', html); else drawer.insertAdjacentHTML('afterbegin', html);
      $$('details, .drawer > a', drawer).forEach(function (el, k) { el.style.setProperty('--n', k); });
    }
  }

  function renderFooter(cols) {
    var top = $('.footer__top');
    if (!top || !Array.isArray(cols) || !cols.length) return;
    var lang = $('#google_translate_element');
    var langBox = lang ? lang.parentNode : null;
    // keep the language widget (Google loads into it) while the link columns are rebuilt
    var langHead = langBox ? $('h4.mt', langBox) : null;
    if (lang) lang.remove();
    if (langHead) langHead.remove();
    $$(':scope > div:not(.footer__brand)', top).forEach(function (el) { el.remove(); });
    var html = cols.filter(function (c) { return c && (c.title || (c.links || []).length); }).map(function (c) {
      return '<div><h4' + (c.hideTitle ? ' class="h4--blank"' : '') + '>' + esc(c.title || '') + '</h4><ul>' +
        (c.links || []).filter(function (l) { return l && l.label; }).map(function (l) {
          return '<li' + (samePage(l.href) ? ' class="is-active"' : '') + '>' + a(l) + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
    top.insertAdjacentHTML('beforeend', html);
    var last = top.lastElementChild;
    if (lang && last) {
      if (langHead) last.appendChild(langHead); else last.insertAdjacentHTML('beforeend', '<h4 class="mt">Language Translator</h4>');
      last.appendChild(lang);
    }
  }

  function renderContact(c) {
    if (!c || typeof c !== 'object') return;
    $$('[data-c]').forEach(function (el) {
      var k = el.getAttribute('data-c'), v = k === 'alert' ? c.alertLabel : c[k];
      if (v == null) return;
      var t = el.hasAttribute('data-c-text') ? el : ($('[data-c-text]', el) || el);
      if (k === 'email') { el.href = 'mailto:' + v; setText(t, v); }
      else if (k === 'phone') { setText(t, v); if (c.phoneDial) el.href = 'tel:' + String(c.phoneDial).replace(/[^\d+]/g, ''); }
      else if (k === 'address' || k === 'copyright' || k === 'credit') setText(t, v);
      else if (k === 'alert') {
        el.hidden = !c.alertLabel;
        el.href = url(c.alertHref);
        setText($('[data-c-text]', el) || el, c.alertLabel || '');
        var nw = $('.new', el); if (nw) nw.hidden = !c.alertNew;
      } else {
        // plain links: sitemap, webmail, hodmail, cms, social
        var li = el.closest('li') && !el.closest('.topbar__social') ? el.closest('li') : el;
        li.hidden = !v;
        if (v) el.href = url(v);
      }
    });
    $$('[data-c-dial]').forEach(function (el) { if (c.phoneDial) el.href = 'tel:' + String(c.phoneDial).replace(/[^\d+]/g, ''); });
  }
  function setText(el, v) { el.textContent = v; }

  window.CMCHChrome = {
    apply: function (d) {
      if (!d) return;
      try { renderMenu(d.menu); } catch (e) { /* keep the built-in menu */ }
      try { renderFooter(d.footerCols); } catch (e) { /* keep the built-in footer */ }
      try { renderContact(d.contact); } catch (e) { /* keep the built-in contact */ }
    },
    url: url
  };
})();
