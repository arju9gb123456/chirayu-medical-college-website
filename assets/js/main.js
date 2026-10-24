/* =========================================================
   Chirayu Medical College & Hospital — Homepage script
   Content comes from content/home.json (admin-managed).
   Designed & developed by Arjun Ahirwar
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CONTENT_URL = 'content/home.json';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bind(name) { return $('[data-bind="' + name + '"]'); }
  function icon(id, extra) { return '<svg' + (extra || '') + '><use href="#i-' + id + '"/></svg>'; }

  /* ---------------- Loader ---------------- */
  var loader = { pct: 0, target: 70, el: $('.loader__pct'), done: false, start: performance.now() };
  function tickLoader() {
    if (loader.done) return;
    loader.pct += (loader.target - loader.pct) * 0.08;
    if (loader.el) loader.el.textContent = Math.round(loader.pct);
    requestAnimationFrame(tickLoader);
  }
  tickLoader();
  function finishLoader() {
    var wait = Math.max(0, 900 - (performance.now() - loader.start));
    loader.target = 100;
    setTimeout(function () {
      loader.done = true;
      if (loader.el) loader.el.textContent = '100';
      setTimeout(function () {
        document.body.classList.add('is-loaded');
        heroTitle.show(0, true);
      }, 180);
    }, wait);
  }
  setTimeout(finishLoader, 4000); // safety net

  /* ---------------- Renderers (content/home.json) ---------------- */
  function renderHero(h) {
    var slides = (h && h.slides) || [];
    var amb = bind('hero-ambient'), flow = bind('hero-flow'), dots = bind('hero-dots');
    amb.innerHTML = slides.map(function (s, i) {
      return '<div class="amb' + (i === 0 ? ' is-on' : '') + '" style="background-image:url(\'' + esc(s.img) + '\')"></div>';
    }).join('');
    flow.innerHTML = slides.map(function (s, i) {
      return '<figure class="fcard" data-i="' + i + '"><img src="' + esc(s.img) + '" alt="' + esc(s.title) + '"' + (i ? ' loading="lazy"' : '') + '>' +
        '<span class="fcard__glare"></span><figcaption class="fcard__cap"><b>' + esc(s.capTitle || s.title) + '</b><span>' + esc(s.capSub || '') + '</span></figcaption></figure>';
    }).join('');
    dots.innerHTML = slides.map(function (s, i) {
      return '<button type="button" aria-label="Go to slide ' + (i + 1) + '"><span class="bar"></span></button>';
    }).join('');
    bind('hero-facts').innerHTML = ((h && h.facts) || []).map(function (f) {
      return '<div><b><span data-count="' + esc(f.value) + '">' + esc(f.value) + '</span>' + (f.unit ? ' <em>' + esc(f.unit) + '</em>' : '') + '</b><span>' + esc(f.label) + '</span></div>';
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
    return '<a class="nrow" href="' + esc(item.href) + '" target="_blank" rel="noopener">' + inner(item.icon || (item.title === 'MORE DETAILS' ? 'link' : 'file')) + '</a>';
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
      return '<button type="button" class="vid" data-video="' + esc(v.video) + '" data-title="' + esc(v.title) + '" data-reveal>' +
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
      return '<a class="cat" href="' + esc(g.href) + '" title="' + esc(g.title) + '" data-reveal><img src="' + esc(g.img) + '" alt="' + esc(g.title) + ' Events" loading="lazy">' +
        '<span class="cat__ic">' + icon('link') + '</span><span class="cat__body"><small>Category</small><b>' + esc(g.title) + '</b><span class="cat__line"></span><span class="cat__go">View Event ' + icon('arrow') + '</span></span></a>';
    }).join('');
  }

  function renderAll(c) {
    renderHero(c.hero);
    renderTicker(c.ticker);
    renderLists(c);
    renderVideos(c.videos);
    renderNews(c.news);
    renderGallery(c.gallery);
    visitors(c.visitorBase || 0);
  }

  /* ---------------- Hero coverflow ---------------- */
  var hero = { el: $('.hero'), slides: [], i: 0, timer: null, dur: 6500, paused: false };

  var heroTitle = {
    el: $('.hero__title .t'),
    split: function (text) {
      var n = 0;
      return text.split(' ').map(function (w) {
        return '<span class="w"><span style="--i:' + (n++) + '">' + esc(w) + '</span></span>';
      }).join(' ');
    },
    show: function (idx, first) {
      var h1 = $('.hero__title'), lede = $('.hero__lede');
      var s = hero.slides[idx];
      if (!s || !h1) return;
      var apply = function () {
        heroTitle.el.innerHTML = heroTitle.split(s.title);
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
    });
    $$('.flow__dots button').forEach(function (b, k) {
      b.setAttribute('aria-current', k === hero.i ? 'true' : 'false');
      b.style.setProperty('--dur', hero.dur + 'ms');
      var bar = b.firstElementChild; // restart fill animation
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
      if (finePointer) {
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
    var t0 = performance.now(), period = 5200, visible = true;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(svg);
    (function frame(now) {
      if (visible) {
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
      var count = Math.round(Math.min(70, W * H / 18000));
      pts = [];
      for (var i = 0; i < count; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.8 + .8, plus: Math.random() < .12 });
    }
    size(); window.addEventListener('resize', size);
    hero.el.addEventListener('mousemove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.el.addEventListener('mouseleave', function () { mouse.x = mouse.y = -999; });
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
    (function frame() {
      if (visible) {
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
        }
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------------- Count-up for hero facts ---------------- */
  function countUp() {
    $$('[data-count]').forEach(function (el) {
      var to = parseInt(el.dataset.count, 10);
      if (isNaN(to) || reduce) return;
      var from = to > 1900 && to < 2100 ? 1950 : 0, t0 = performance.now(), dur = 1800;
      (function f(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    });
  }

  /* ---------------- Header / progress / to-top ---------------- */
  function initScroll() {
    var header = $('.header'), prog = $('.progress'), top = $('.to-top'), circle = $('.to-top circle');
    var ticking = false;
    function update() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight, p = max > 0 ? y / max : 0;
      header.classList.toggle('is-stuck', y > 40);
      prog.style.transform = 'scaleX(' + p + ')';
      top.classList.toggle('is-shown', y > 600);
      circle.style.setProperty('--off', 151 - 151 * p);
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    update();
  }

  /* ---------------- Mobile drawer ---------------- */
  function initDrawer() {
    var burger = $('.burger'), drawer = $('#drawer'), scrim = $('.drawer-scrim');
    function set(open) {
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.classList.toggle('no-scroll', open);
    }
    burger.addEventListener('click', function () { set(!drawer.classList.contains('is-open')); });
    scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080) set(false); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
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
    var extra = [$('.about__body'), $('.footer')];
    extra.forEach(function (el) { if (el && revealIO) revealIO.observe(el); });
  }

  /* ---------------- Tabs ---------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var tabs = $$('[role="tab"]', wrap), ink = $('.tabs__ink', wrap);
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
      var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      requestAnimationFrame(function () { moveInk(cur); });
      window.addEventListener('resize', function () { moveInk(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
      if (document.fonts) document.fonts.ready.then(function () { moveInk(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
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
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (e.target === p) { e.preventDefault(); open(p); } } });
    });
  }

  /* ---------------- Tilt / magnetic / button spotlight ---------------- */
  function initPointerFx() {
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
        b.style.transform = 'translate(' + x * .22 + 'px,' + y * .3 + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
    document.addEventListener('mouseover', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      b.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    // gallery cards: subtle 3D lean
    document.addEventListener('mousemove', function (e) {
      var c = e.target.closest && e.target.closest('.cat');
      if (!c) return;
      var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      c.style.transform = 'perspective(800px) rotateY(' + px * 8 + 'deg) rotateX(' + -py * 8 + 'deg)';
      c.style.transition = 'transform .15s ease-out';
      c.onmouseleave = function () { c.style.transform = ''; c.style.transition = 'transform .6s cubic-bezier(.22,.8,.24,1)'; };
    });
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
      document.body.classList.add('no-scroll');
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
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
    } catch (e) { /* storage blocked — show base */ }
    var str = String(base + extra);
    var html = '';
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
  function lazyScript(src, target, cb) {
    var done = false;
    function load() {
      if (done) return; done = true;
      var s = document.createElement('script'); s.src = src; s.async = true; if (cb) s.onload = cb;
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
  initScroll();
  initDrawer();
  initTabs();
  initPanels();
  initVideo();
  initECG();
  initParticles();

  fetch(CONTENT_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (c) {
      renderAll(c);
      initHero();
      observeReveals();
      initPointerFx();
      finishLoader();
      setTimeout(countUp, 1100);
    })
    .catch(function (err) {
      console.error('Homepage content could not load from ' + CONTENT_URL + '. Open the site through a web server (Netlify / VS Code Live Server), not as a file.', err);
      observeReveals();
      initPointerFx();
      finishLoader();
    });

  lazyScript('https://static.elfsight.com/platform/platform.js', $('.elfsight-wrap'));
  lazyScript('https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit', $('#google_translate_element'));
})();
