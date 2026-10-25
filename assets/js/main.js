/* =========================================================
   Chirayu Medical College & Hospital — Homepage script
   Content: Supabase (site_content.key = 'home')  →  fallback content/home.json
   Preview of unsaved admin edits: /?preview=draft
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CFG = window.CMCH_CONFIG || {};
  var CONTENT_URL = 'content/home.json';
  var DRAFT_KEY = 'cmch_admin_draft_home';
  var lenis = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bind(name) { return $('[data-bind="' + name + '"]'); }
  function icon(id, extra) { return '<svg' + (extra || '') + '><use href="#i-' + id + '"/></svg>'; }

  /* ---------------- Content loading ---------------- */
  function loadContent() {
    var isPreview = /[?&]preview=draft/.test(location.search);
    if (isPreview) {
      try {
        var d = localStorage.getItem(DRAFT_KEY);
        if (d) { showPreviewBadge(); return Promise.resolve(JSON.parse(d)); }
      } catch (e) { /* fall through */ }
    }
    var fromFile = function () {
      return fetch(CONTENT_URL, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    };
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/site_content?key=eq.home&select=data', {
        headers: { apikey: CFG.supabaseAnonKey } // works with new sb_publishable_ keys and legacy anon keys
      }).then(function (r) {
        if (!r.ok) throw new Error('Supabase ' + r.status);
        return r.json();
      }).then(function (rows) {
        if (!rows || !rows[0] || !rows[0].data) throw new Error('No content row yet');
        return rows[0].data;
      }).catch(function (e) {
        console.warn('Supabase content unavailable, using content/home.json:', e.message);
        return fromFile();
      });
    }
    return fromFile();
  }
  function showPreviewBadge() {
    var b = document.createElement('a');
    b.className = 'preview-badge';
    b.href = location.pathname;
    b.innerHTML = '<span class="emerg-dot"></span> Draft preview (not published) <u>Exit</u>';
    document.body.appendChild(b);
  }

  /* ---------------- Loader ---------------- */
  var loader = { pct: 0, target: 70, el: $('.loader__pct'), done: false, start: performance.now(), finished: false };
  (function tickLoader() {
    if (loader.done) return;
    loader.pct += (loader.target - loader.pct) * 0.08;
    if (loader.el) loader.el.textContent = Math.round(loader.pct);
    requestAnimationFrame(tickLoader);
  })();
  function finishLoader() {
    if (loader.finished) return;
    loader.finished = true;
    var wait = Math.max(0, 900 - (performance.now() - loader.start));
    loader.target = 100;
    setTimeout(function () {
      loader.done = true;
      if (loader.el) loader.el.textContent = '100';
      setTimeout(function () {
        document.body.classList.add('is-loaded');
        heroTitle.show(0, true);
        setTimeout(countUpHero, 900);
      }, 180);
    }, wait);
  }
  setTimeout(finishLoader, 5000); // safety net

  /* ---------------- Renderers ---------------- */
  function renderHero(h) {
    var slides = (h && h.slides) || [];
    bind('hero-ambient').innerHTML = slides.map(function (s, i) {
      return '<div class="amb' + (i === 0 ? ' is-on' : '') + '" style="background-image:url(\'' + esc(s.img) + '\')"></div>';
    }).join('');
    bind('hero-flow').innerHTML = slides.map(function (s, i) {
      return '<figure class="fcard" data-i="' + i + '" data-cursor="' + (i ? 'Open' : '') + '"><img src="' + esc(s.img) + '" alt="' + esc(s.title) + '"' + (i ? ' loading="lazy"' : '') + '>' +
        '<span class="fcard__glare"></span><figcaption class="fcard__cap"><b>' + esc(s.capTitle || s.title) + '</b><span>' + esc(s.capSub || '') + '</span></figcaption></figure>';
    }).join('');
    bind('hero-dots').innerHTML = slides.map(function (s, i) {
      return '<button type="button" aria-label="Go to slide ' + (i + 1) + '"><span class="bar"></span></button>';
    }).join('');
    bind('hero-facts').innerHTML = ((h && h.facts) || []).map(function (f) {
      return '<div><b><span data-count="' + esc(f.value) + '" data-count-hero>' + esc(f.value) + '</span>' + (f.unit ? ' <em>' + esc(f.unit) + '</em>' : '') + '</b><span>' + esc(f.label) + '</span></div>';
    }).join('');
    hero.slides = slides;
  }

  function renderTicker(items) {
    var one = (items || []).map(function (t) {
      return '<a class="ticker__item" href="' + esc(t.href) + '" target="_blank" rel="noopener"><span class="tag tag--' + esc(t.color || 'teal') + '">' + esc(t.tag) + '</span>' + esc(t.text) + '</a>';
    }).join('');
    var track = bind('ticker');
    track.innerHTML = one + one.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
    track.style.setProperty('--speed', Math.max(30, (items || []).length * 11) + 's');
  }

  function nrow(item) {
    var inner = function (ic) {
      return '<span class="nrow__ic">' + icon(ic) + '</span><b>' + esc(item.title || item.text) + '</b><span class="nrow__go">' + icon('arrow') + '</span>';
    };
    if (item.video) {
      return '<button type="button" class="nrow" data-video="' + esc(item.video) + '" data-title="' + esc(item.title) + '">' + inner('play') + '</button>';
    }
    return '<a class="nrow" href="' + esc(item.href) + '" target="_blank" rel="noopener">' + inner(item.icon || (/^more details$/i.test(item.title || '') ? 'link' : 'file')) + '</a>';
  }

  function renderLists(c) {
    bind('notices').innerHTML = (c.notices || []).map(nrow).join('');
    bind('media').innerHTML = (c.media || []).map(nrow).join('');
    var up = c.upcomingEvents || [];
    bind('upcoming').innerHTML = up.length ? up.map(nrow).join('') :
      '<div class="soon"><span class="nrow__ic">' + icon('bell') + '</span> COMING SOON...!!! <span class="new">NEW</span></div>';

    var notices = (c.studentInfo || []).map(function (n) {
      return '<a class="notice" href="' + esc(n.href) + '" target="_blank" rel="noopener"><span class="notice__ic">' + icon(n.icon || 'file') + '</span><span><b>' +
        esc(n.text) + (n.isNew ? ' <span class="new">NEW</span>' : '') + '</b><span class="sub">Click here ' + icon('arrow', ' width="14" height="14"') + '</span></span></a>';
    }).join('');
    var bt = bind('student-info');
    bt.innerHTML = notices + notices.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
    bt.style.setProperty('--vs', Math.max(18, (c.studentInfo || []).length * 5) + 's');
  }

  function renderVideos(list) {
    bind('videos').innerHTML = (list || []).map(function (v) {
      return '<button type="button" class="vid" data-video="' + esc(v.video) + '" data-title="' + esc(v.title) + '" data-cursor="Play" data-reveal>' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.video) + '/hqdefault.jpg" alt="" loading="lazy">' +
        '<span class="vid__frame"></span><span class="vid__play">' + icon('play') + '</span>' +
        '<span class="vid__cap">' + (v.tag ? '<span class="tag">' + esc(v.tag) + '</span>' : '') + '<b>' + esc(v.title) + '</b><span>' + icon('yt') + ' Play Video</span></span></button>';
    }).join('');
  }

  function renderNews(list) {
    bind('news').innerHTML = (list || []).map(function (n) {
      return '<a class="nitem" href="' + esc(n.href) + '" data-reveal>' +
        '<div class="nitem__date"><b>' + esc(n.day) + '</b><span>' + esc(n.month) + '</span></div>' +
        '<div><span class="tag tag--' + esc(n.color || 'teal') + '">' + esc(n.tag) + '</span><h3>' + esc(n.title) + '</h3><span class="more">Read More ' + icon('arrow') + '</span></div>' +
        '<span class="nitem__thumb"><img alt="' + esc(n.title) + '" src="' + esc(n.img) + '" loading="lazy"></span></a>';
    }).join('');
  }

  function renderGallery(list) {
    bind('gallery').innerHTML = (list || []).map(function (g) {
      return '<a class="cat" href="' + esc(g.href) + '" title="' + esc(g.title) + '" data-cursor="View" data-reveal><img src="' + esc(g.img) + '" alt="' + esc(g.title) + ' Events" loading="lazy">' +
        '<span class="cat__ic">' + icon('link') + '</span><span class="cat__body"><small>Category</small><b>' + esc(g.title) + '</b><span class="cat__line"></span><span class="cat__go">View Event ' + icon('arrow') + '</span></span></a>';
    }).join('');
  }

  /* Static sections whose text/images the admin can override (data-c="key") */
  function applyBlocks(b) {
    if (!b) return;
    $$('[data-c]').forEach(function (el) {
      var v = b[el.dataset.c];
      if (v == null || v === '') return;
      if (el.dataset.cAttr) el.setAttribute(el.dataset.cAttr, v);
      else if (el.tagName === 'IMG') el.src = v;
      else if (el.hasAttribute('data-c-bg')) el.style.backgroundImage = 'url("' + String(v).replace(/"/g, '%22') + '")';
      else el.textContent = v;
    });
  }

  function renderAll(c) {
    renderHero(c.hero);
    renderTicker(c.ticker);
    renderLists(c);
    renderVideos(c.videos);
    renderNews(c.news);
    renderGallery(c.gallery);
    applyBlocks(c.blocks);
    visitors(c.visitorBase || 0);
  }

  /* ---------------- Hero coverflow ---------------- */
  var hero = { el: $('.hero'), slides: [], i: 0, timer: null, dur: 6500, paused: false };

  function splitWords(text, startIdx) {
    var n = startIdx || 0;
    return String(text).split(/\s+/).filter(Boolean).map(function (w) {
      return '<span class="w"><span style="--i:' + (n++) + '">' + esc(w) + '</span></span>';
    }).join(' ');
  }

  var heroTitle = {
    show: function (idx, first) {
      var h1 = $('.hero__title'), lede = $('.hero__lede'), t = $('.hero__title .t');
      var s = hero.slides[idx];
      if (!s || !h1) return;
      var apply = function () {
        t.innerHTML = splitWords(s.title);
        h1.classList.remove('is-out', 'is-in');
        void h1.offsetWidth;
        requestAnimationFrame(function () { h1.classList.add('is-in'); });
        lede.textContent = s.lede;
        lede.classList.remove('is-swap');
      };
      if (first || reduce) { apply(); return; }
      h1.classList.add('is-out');
      lede.classList.add('is-swap');
      setTimeout(apply, 420);
    }
  };

  function layoutFlow() {
    var cards = $$('.fcard'), n = cards.length;
    if (!n) return;
    var narrow = window.innerWidth < 640;
    cards.forEach(function (c, k) {
      var off = ((k - hero.i) % n + n) % n;
      if (off > n / 2) off -= n;
      var x, z, ry, sc, op, zi, f;
      if (off === 0) { x = 0; z = 0; ry = 0; sc = 1; op = 1; zi = 10; f = 'none'; }
      else if (Math.abs(off) === 1) {
        x = off * (narrow ? 34 : 46); z = -220; ry = -off * 28; sc = .82; op = .85; zi = 5; f = 'saturate(.7) brightness(.85)';
      } else { x = off * 60; z = -420; ry = -off * 35; sc = .6; op = 0; zi = 1; f = 'none'; }
      c.style.transform = 'translate(-50%,-50%) translateX(' + x + '%) translateZ(' + z + 'px) rotateY(' + ry + 'deg) scale(' + sc + ')';
      c.style.opacity = op;
      c.style.zIndex = zi;
      c.style.filter = f;
      c.classList.toggle('is-active', off === 0);
      c.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      c.dataset.cursor = off === 0 ? '' : (off < 0 ? 'Prev' : 'Next');
    });
    $$('.flow__dots button').forEach(function (b, k) {
      b.setAttribute('aria-current', k === hero.i ? 'true' : 'false');
      b.style.setProperty('--dur', hero.dur + 'ms');
      var bar = b.firstElementChild;
      bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
    $$('.amb').forEach(function (a, k) { a.classList.toggle('is-on', k === hero.i); });
  }

  function go(idx, user) {
    var n = hero.slides.length;
    if (!n) return;
    hero.i = (idx + n) % n;
    layoutFlow();
    heroTitle.show(hero.i);
    restart();
    if (user) hero.el.classList.remove('is-paused');
  }
  function restart() {
    clearTimeout(hero.timer);
    if (reduce || hero.paused) return;
    hero.timer = setTimeout(function () { go(hero.i + 1); }, hero.dur);
  }
  function initHero() {
    layoutFlow();
    var show = $('.hero__show');
    $('[data-prev]').addEventListener('click', function () { go(hero.i - 1, true); });
    $('[data-next]').addEventListener('click', function () { go(hero.i + 1, true); });
    $$('.flow__dots button').forEach(function (b, k) { b.addEventListener('click', function () { go(k, true); }); });
    $$('.fcard').forEach(function (c) {
      c.addEventListener('click', function () { var k = +c.dataset.i; if (k !== hero.i) go(k, true); });
      if (finePointer && !reduce) {
        c.addEventListener('mousemove', function (e) {
          if (!c.classList.contains('is-active')) return;
          var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          c.style.transform = 'translate(-50%,-50%) rotateY(' + ((px - .5) * 12) + 'deg) rotateX(' + ((.5 - py) * 10) + 'deg) scale(1.02)';
          c.style.transition = 'transform .15s ease-out';
          c.style.setProperty('--gx', px * 100 + '%'); c.style.setProperty('--gy', py * 100 + '%');
        });
        c.addEventListener('mouseleave', function () { c.style.transition = ''; layoutFlow(); });
      }
    });
    show.addEventListener('mouseenter', function () { hero.paused = true; hero.el.classList.add('is-paused'); clearTimeout(hero.timer); });
    show.addEventListener('mouseleave', function () { hero.paused = false; hero.el.classList.remove('is-paused'); go(hero.i); });
    hero.el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(hero.i - 1, true);
      if (e.key === 'ArrowRight') go(hero.i + 1, true);
    });
    var sx = 0;
    show.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    show.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(hero.i + (dx < 0 ? 1 : -1), true);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(hero.timer); else restart(); });
    window.addEventListener('resize', layoutFlow);

    // mouse parallax on the whole hero
    if (finePointer && !reduce) {
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      hero.el.addEventListener('mousemove', function (e) {
        var r = hero.el.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
        if (!raf) raf = requestAnimationFrame(step);
      });
      hero.el.addEventListener('mouseleave', function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(step); });
      var step = function () {
        cx += (tx - cx) * .08; cy += (ty - cy) * .08;
        hero.el.style.setProperty('--px', cx.toFixed(4));
        hero.el.style.setProperty('--py', cy.toFixed(4));
        raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .001) ? requestAnimationFrame(step) : null;
      };
    }
    restart();
  }

  /* ---------------- Hero ECG trace ---------------- */
  function initECG() {
    var svg = $('.hero__ecg svg');
    if (!svg) return;
    var d = 'M0 55';
    for (var x = 0; x < 1600; x += 200) {
      d += ' H' + (x + 80) + ' l8 -6 l8 6 h10 l6 10 l9 -48 l10 56 l6 -18 h14 l12 -8 l12 8 H' + (x + 200);
    }
    var bg = $('.trace-bg', svg), tr = $('.trace', svg), blip = $('.blip', svg);
    bg.setAttribute('d', d); tr.setAttribute('d', d);
    var len = tr.getTotalLength(), seg = 360;
    tr.style.strokeDasharray = seg + ' ' + len;
    if (reduce) { tr.style.strokeDasharray = 'none'; blip.style.display = 'none'; return; }
    var t0 = performance.now(), period = 5200, visible = true, scrolling = 0;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(svg);
    window.addEventListener('scroll', function () { scrolling = performance.now(); }, { passive: true });
    (function frame(now) {
      if (visible && now - scrolling > 160) {
        var p = ((now - t0) % period) / period, at = p * (len + seg);
        tr.style.strokeDashoffset = -(at - seg);
        var pt = tr.getPointAtLength(Math.min(at, len));
        blip.setAttribute('cx', pt.x); blip.setAttribute('cy', pt.y);
        blip.style.opacity = at > len ? 0 : 1;
      }
      requestAnimationFrame(frame);
    })(t0);
  }

  /* ---------------- Hero particles ---------------- */
  function initParticles() {
    var cv = $('.hero__particles');
    if (!cv || reduce) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W, H, pts = [], mouse = { x: -999, y: -999 }, visible = true;
    function size() {
      W = cv.offsetWidth; H = cv.offsetHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(48, W * H / 24000));
      pts = [];
      for (var i = 0; i < count; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.8 + .8, plus: Math.random() < .12 });
    }
    size(); window.addEventListener('resize', size);
    hero.el.addEventListener('mousemove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.el.addEventListener('mouseleave', function () { mouse.x = mouse.y = -999; });
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
    var scrolling = 0;
    window.addEventListener('scroll', function () { scrolling = performance.now(); }, { passive: true });
    (function frame() {
      if (visible && performance.now() - scrolling > 160) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i], dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) { p.x += dx / dist * 1.4; p.y += dy / dist * 1.4; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          ctx.fillStyle = 'rgba(10,142,151,.45)';
          if (p.plus) { ctx.fillRect(p.x - 4, p.y - 1, 8, 2); ctx.fillRect(p.x - 1, p.y - 4, 2, 8); }
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
          for (var j = i + 1; j < pts.length; j++) {
            var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, d2 = ex * ex + ey * ey;
            if (d2 < 11000) {
              ctx.strokeStyle = 'rgba(10,142,151,' + (0.14 * (1 - d2 / 11000)) + ')';
              ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
          if (dist < 160 && mouse.x > 0) {
            ctx.strokeStyle = 'rgba(10,142,151,' + (0.35 * (1 - dist / 160)) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------------- Count-up ---------------- */
  function countUp(el) {
    var to = parseInt(el.dataset.count, 10);
    if (isNaN(to) || reduce || el.dataset.counted) return;
    el.dataset.counted = 1;
    var from = to > 1900 && to < 2100 ? 1950 : 0, t0 = performance.now(), dur = 1800;
    (function f(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  function countUpHero() { $$('[data-count-hero]').forEach(countUp); }

  /* ---------------- Split headings (word rise) ---------------- */
  function initSplit() {
    $$('[data-split]').forEach(function (el) {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = 1;
      el.setAttribute('aria-label', el.textContent.trim());
      el.innerHTML = '<span aria-hidden="true">' + splitWords(el.textContent.trim()) + '</span>';
      el.classList.add('split');
    });
  }

  /* ---------------- Scroll-scrubbed text highlight ---------------- */
  var scrubs = [];
  function initScrub() {
    $$('[data-scrub]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.setAttribute('aria-label', el.textContent.trim());
      el.innerHTML = '<span aria-hidden="true">' + words.map(function (w) { return '<span class="sw">' + esc(w) + '</span>'; }).join(' ') + '</span>';
      el.classList.add('scrub');
      scrubs.push({ el: el, words: $$('.sw', el) });
    });
  }
  function readScrub(vh) {
    return scrubs.map(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return -1;
      var p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .35)));
      return Math.round(p * s.words.length);
    });
  }
  function writeScrub(lits) {
    scrubs.forEach(function (s, k) {
      var lit = lits[k];
      if (lit < 0 || lit === s.lit) return;
      s.lit = lit;
      for (var i = 0; i < s.words.length; i++) s.words[i].classList.toggle('on', i < lit);
    });
  }

  /* ---------------- Parallax ---------------- */
  var parallax = [];
  function initParallax() {
    if (reduce) return;
    $$('[data-parallax],[data-parallax-x]').forEach(function (el) {
      parallax.push({ el: el, y: parseFloat(el.dataset.parallax || 0), x: parseFloat(el.dataset.parallaxX || 0) });
    });
  }
  /* Layout position is measured once (and on resize), so scrolling only
     does math + one style write per element, never a layout read. */
  function measureParallax() {
    var y = window.scrollY;
    parallax.forEach(function (p) {
      var prev = p.el.style.translate; p.el.style.translate = '';
      var r = p.el.getBoundingClientRect();
      p.top = r.top + y; p.h = r.height;
      p.el.style.translate = prev;
    });
  }
  function updateParallax(y, vh) {
    parallax.forEach(function (p) {
      var top = p.top - y;
      if (top + p.h < -200 || top > vh + 200) return;
      var off = top + p.h / 2 - vh / 2;
      p.el.style.translate = (p.x ? (-y * p.x).toFixed(1) : '0') + 'px ' + (p.y ? (off * p.y).toFixed(1) : '0') + 'px';
    });
  }

  /* ---------------- Header / progress / to-top ---------------- */
  function initScroll() {
    var header = $('.header'), prog = $('.progress'), top = $('.to-top'), circle = $('.to-top circle');
    var ticking = false, anchorY = 0, hidden = false, docH = 0, vh = 0;
    function measure() {
      vh = window.innerHeight;
      docH = document.documentElement.scrollHeight;
      measureParallax();
    }
    function update() {
      ticking = false;
      // reads
      var y = window.scrollY, max = docH - vh, p = max > 0 ? Math.min(1, y / max) : 0;
      var lits = readScrub(vh);
      // header: hide after scrolling down 120px, show after scrolling up 60px
      if (y < 300 || document.body.classList.contains('no-scroll')) { hidden = false; anchorY = y; }
      else if (!hidden && y - anchorY > 120) { hidden = true; anchorY = y; }
      else if (hidden && anchorY - y > 60) { hidden = false; anchorY = y; }
      else if ((hidden && y > anchorY) || (!hidden && y < anchorY)) anchorY = y;
      // writes
      header.classList.toggle('is-stuck', y > 40);
      header.classList.toggle('is-hidden', hidden);
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      top.classList.toggle('is-shown', y > 600);
      circle.style.setProperty('--off', (151 - 151 * p).toFixed(1));
      writeScrub(lits);
      updateParallax(y, vh);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('load', function () { measure(); onScroll(); });
    if (document.fonts) document.fonts.ready.then(function () { measure(); onScroll(); });
    measure();
    top.addEventListener('click', function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    update();
  }

  /* ---------------- Smooth scroll (desktop) ---------------- */
  function initLenis() {
    if (reduce || !finePointer || typeof window.Lenis !== 'function') return;
    try {
      lenis = new window.Lenis({
        lerp: 0.12,            // how quickly the page catches up to the wheel (higher = snappier)
        wheelMultiplier: 1,
        smoothWheel: true,
        syncTouch: false,      // phones keep their native scrolling
        prevent: function (node) { return !!(node.closest && node.closest('.drawer, .board__viewport, [data-lenis-prevent]')); }
      });
      document.documentElement.classList.add('smooth-scroll');
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.querySelector(id);
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
      });
    } catch (e) { lenis = null; }
  }
  function lockScroll(on) {
    document.body.classList.toggle('no-scroll', on);
    // lock on <html>: with overflow-x:clip there, body overflow no longer reaches the viewport
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  /* ---------------- Mobile drawer ---------------- */
  function initDrawer() {
    var burger = $('.burger'), drawer = $('#drawer'), scrim = $('.drawer-scrim');
    function set(open) {
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      lockScroll(open);
    }
    burger.addEventListener('click', function () { set(!drawer.classList.contains('is-open')); });
    scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080 && drawer.classList.contains('is-open')) set(false); });
    $$('.drawer details, .drawer > a').forEach(function (el, k) { el.style.setProperty('--n', k); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
      $$('[data-count]:not([data-count-hero])', en.target).forEach(countUp);
      if (en.target.matches('[data-count]:not([data-count-hero])')) countUp(en.target);
      revealIO.unobserve(en.target);
    });
  }, { threshold: .14, rootMargin: '0px 0px -40px 0px' }) : null;
  function observeReveals() {
    var groups = new Map();
    $$('[data-reveal]:not(.is-visible)').forEach(function (el) {
      var parent = el.parentElement, k = groups.get(parent) || 0;
      el.style.setProperty('--rd', Math.min(k, 6) * 0.09 + 's');
      groups.set(parent, k + 1);
      if (revealIO) revealIO.observe(el); else el.classList.add('is-visible');
    });
    $$('.head, .split, .about__body, .footer, .chair, .stack').forEach(function (el) {
      if (revealIO) revealIO.observe(el); else el.classList.add('is-visible');
    });
  }

  /* ---------------- Tabs ---------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var tabs = $$('[role="tab"]', wrap), ink = $('.tabs__ink', wrap);
      var current = function () { return tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]; };
      function moveInk(t) { ink.style.width = t.offsetWidth + 'px'; ink.style.transform = 'translateX(' + t.offsetLeft + 'px)'; }
      function select(t) {
        tabs.forEach(function (o) {
          var on = o === t;
          o.setAttribute('aria-selected', on); o.tabIndex = on ? 0 : -1;
          document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
        });
        moveInk(t);
      }
      tabs.forEach(function (t, k) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { var n = tabs[(k + d + tabs.length) % tabs.length]; n.focus(); select(n); }
        });
      });
      requestAnimationFrame(function () { moveInk(current()); });
      window.addEventListener('resize', function () { moveInk(current()); });
      if (document.fonts) document.fonts.ready.then(function () { moveInk(current()); });
    });
  }

  /* ---------------- Virtual tour accordion ---------------- */
  function initPanels() {
    var panels = $$('.panel');
    function open(p) {
      panels.forEach(function (o) { var on = o === p; o.classList.toggle('is-open', on); o.setAttribute('aria-expanded', on); });
    }
    panels.forEach(function (p) {
      p.addEventListener('click', function (e) { if (!p.classList.contains('is-open')) { e.preventDefault(); open(p); } });
      if (finePointer) p.addEventListener('mouseenter', function () { open(p); });
      p.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === p) { e.preventDefault(); open(p); } });
    });
  }

  /* ---------------- Pointer effects ---------------- */
  function initPointerFx() {
    // nav dropdown stagger index
    $$('.drop').forEach(function (d) { $$('a, .drop__head', d).forEach(function (a, k) { a.style.setProperty('--n', k); }); });

    // ripple on buttons (all devices)
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn, .flow__btn, .tabs__bar button');
      if (!b || reduce) return;
      var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = document.createElement('span');
      rp.className = 'ripple';
      rp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      b.appendChild(rp);
      setTimeout(function () { rp.remove(); }, 700);
    });

    if (!finePointer || reduce) return;

    $$('[data-tilt]').forEach(function (wrap) {
      var max = +wrap.dataset.tilt || 8, t = $('[data-tilt-target]', wrap);
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        t.style.transform = 'rotateY(' + px * max * 2 + 'deg) rotateX(' + -py * max * 2 + 'deg)';
      });
      wrap.addEventListener('mouseleave', function () { t.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        b.style.translate = (x * .22).toFixed(1) + 'px ' + (y * .3).toFixed(1) + 'px';
      });
      b.addEventListener('mouseleave', function () { b.style.translate = ''; });
    });

    // spotlight glow following the pointer on cards
    $$('.hl, .nitem, .accred, .tabs, .board, .notice, .cta').forEach(function (el) {
      if ($('.spot', el)) return;
      var s = document.createElement('span'); s.className = 'spot'; s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
    });
    document.addEventListener('mousemove', function (e) {
      var t = e.target.closest && e.target.closest('.hl, .nitem, .accred, .tabs, .board, .notice, .cta, .btn');
      if (t) {
        var r = t.getBoundingClientRect();
        t.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        t.style.setProperty('--sy', (e.clientY - r.top) + 'px');
        if (t.classList.contains('btn')) { t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
      }
      var c = e.target.closest && e.target.closest('.cat');
      if (c) {
        var cr = c.getBoundingClientRect(), px = (e.clientX - cr.left) / cr.width - .5, py = (e.clientY - cr.top) / cr.height - .5;
        c.style.transform = 'perspective(800px) rotateY(' + px * 9 + 'deg) rotateX(' + -py * 9 + 'deg)';
        c.style.transition = 'transform .15s ease-out';
        c.onmouseleave = function () { c.style.transform = ''; c.style.transition = 'transform .7s cubic-bezier(.22,.8,.24,1)'; };
      }
    }, { passive: true });

    initCursor();
  }

  /* ---------------- Custom cursor ring ---------------- */
  function initCursor() {
    var cur = $('.cursor');
    if (!cur) return;
    var ring = $('.cursor__ring', cur), dot = $('.cursor__dot', cur), label = $('.cursor__label', cur);
    var mx = -100, my = -100, rx = -100, ry = -100, shown = false;
    document.documentElement.classList.add('has-cursor');
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      if (!shown) { shown = true; rx = mx; ry = my; cur.classList.add('is-on'); }
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, [role="button"], summary, input, select, textarea');
      var txt = t && t.dataset && t.dataset.cursor ? t.dataset.cursor : '';
      cur.classList.toggle('is-hover', !!t && !txt);
      cur.classList.toggle('is-label', !!txt);
      if (txt && label.textContent !== txt) label.textContent = txt;
      cur.classList.toggle('is-dark', !!(e.target.closest && e.target.closest('.section--ink, .footer, .ticker, .board, .cta, .hl--ink, .hl--big, .hl--indigo, .vid, .panel, .cat, .topbar')));
    }, { passive: true });
    document.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cur.classList.remove('is-on'); shown = false; });
    (function loop() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- Video popup ---------------- */
  function initVideo() {
    var box = $('.vbox'), frame = $('.vbox__frame', box), cap = $('p', box), closeBtn = $('.vbox__close', box), last = null;
    function open(id, title) {
      last = document.activeElement;
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" title="' + esc(title) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      cap.textContent = title || '';
      box.hidden = false;
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      lockScroll(true);
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('is-open');
      lockScroll(false);
      setTimeout(function () { box.hidden = true; frame.innerHTML = ''; }, 350);
      if (last) last.focus();
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-video]');
      if (t) { e.preventDefault(); open(t.dataset.video, t.dataset.title); }
    });
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  }

  /* ---------------- Visitor odometer ---------------- */
  function visitors(base) {
    var el = $('[data-visitors]');
    if (!el) return;
    var extra = 0;
    try {
      extra = parseInt(localStorage.getItem('cmch_visits') || '0', 10);
      if (!sessionStorage.getItem('cmch_counted')) { extra += 1; localStorage.setItem('cmch_visits', extra); sessionStorage.setItem('cmch_counted', '1'); }
    } catch (e) { /* storage blocked */ }
    var str = String((+base || 0) + extra), html = '';
    for (var i = 0; i < str.length; i++) {
      if (i && (str.length - i) % 3 === 0) html += '<span class="sep">,</span>';
      html += '<span class="d"><span class="s" data-to="' + str[i] + '">' + '0123456789'.split('').map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</span></span>';
    }
    el.innerHTML = html;
    el.setAttribute('aria-label', 'Visitor counter: ' + str);
    var roll = function () {
      $$('.s', el).forEach(function (s, k) {
        setTimeout(function () { s.style.transform = 'translateY(-' + (+s.dataset.to * 38) + 'px)'; }, k * 80);
      });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { roll(); io.disconnect(); } });
      io.observe(el);
    } else roll();
  }

  /* ---------------- Third-party (lazy) ---------------- */
  function lazyScript(src, target) {
    var done = false;
    function load() {
      if (done) return; done = true;
      var s = document.createElement('script'); s.src = src; s.async = true;
      document.body.appendChild(s);
    }
    if (!target || !('IntersectionObserver' in window)) { setTimeout(load, 2500); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(target);
  }
  window.googleTranslateElementInit = function () {
    if (window.google && google.translate) new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,hi', layout: google.translate.TranslateElement.InlineLayout.SIMPLE }, 'google_translate_element');
  };

  /* ---------------- Boot ---------------- */
  initDrawer();
  initTabs();
  initPanels();
  initVideo();
  initECG();
  initParticles();

  /* Pause looping CSS animations while their section is off-screen */
  function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
    }, { rootMargin: '100px 0px' });
    $$('.hero, .ticker, .board, #about-sev, .footer').forEach(function (el) { io.observe(el); });
  }

  function afterContent() {
    initOffscreenPause();
    initSplit();
    initScrub();
    initParallax();
    initScroll();
    observeReveals();
    initPointerFx();
    finishLoader();
  }

  loadContent()
    .then(function (c) { renderAll(c); initHero(); afterContent(); })
    .catch(function (err) {
      console.error('Homepage content could not load. Open the site through a web server (Vercel / VS Code Live Server), not as a file.', err);
      afterContent();
    });

  initLenis();
  lazyScript('https://static.elfsight.com/platform/platform.js', $('.elfsight-wrap'));
  lazyScript('https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit', $('#google_translate_element'));
})();
