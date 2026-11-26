/* =========================================================
   CMCH — 3D medical equipment scene ("Cinematic Light" design)
   Source file. Build into assets/js/med3d.js with:
     cd tools/med3d && npm i && npm run build
   Everything is modelled in code (no model files to download):
   DNA helix, stethoscope, syringe, capsules, tablets, heart, cross.
   Usage: <div class="med3d" data-med3d="hero|heart"><canvas></canvas></div>
   Designed & developed by Arjun Ahirwar
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector2, Vector3,
  SphereGeometry, CylinderGeometry, CapsuleGeometry, TorusGeometry, TubeGeometry,
  ExtrudeGeometry, Shape, CatmullRomCurve3, MeshPhysicalMaterial, MeshStandardMaterial,
  AmbientLight, DirectionalLight, HemisphereLight, PMREMGenerator, Raycaster,
  ACESFilmicToneMapping, SRGBColorSpace, MathUtils, Color
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var small = Math.min(innerWidth, innerHeight) < 700 || /Mobi|Android/i.test(navigator.userAgent);

/* ---------------- Materials ---------------- */
function mats() {
  return {
    ceramic: new MeshPhysicalMaterial({ color: 0xF4FAFB, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18 }),
    teal: new MeshPhysicalMaterial({ color: 0x0AA6A6, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.2 }),
    tealSoft: new MeshPhysicalMaterial({ color: 0x5ED6D3, roughness: 0.3, clearcoat: 0.8 }),
    blue: new MeshPhysicalMaterial({ color: 0x2F6BFF, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 }),
    red: new MeshPhysicalMaterial({ color: 0xE5484D, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: new Color(0xFF9DA0) }),
    amber: new MeshPhysicalMaterial({ color: 0xF2A93B, roughness: 0.3, clearcoat: 1 }),
    chrome: new MeshStandardMaterial({ color: 0xDDE6EA, metalness: 1, roughness: 0.16 }),
    darkTube: new MeshPhysicalMaterial({ color: 0x163B46, roughness: 0.45, clearcoat: 0.6 }),
    glass: small
      ? new MeshPhysicalMaterial({ color: 0xE9F7F8, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 })
      : new MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.04, transmission: 1, thickness: 0.35, ior: 1.45, clearcoat: 1 }),
    fluid: new MeshPhysicalMaterial({ color: 0x23C3C0, roughness: 0.15, transparent: true, opacity: 0.85, clearcoat: 1 })
  };
}

/* ---------------- Models ---------------- */
function dna(M) {
  var g = new Group(), steps = small ? 18 : 26, h = 7.2, turns = 2.1, r = 1.05;
  var ball = new SphereGeometry(0.2, 20, 14), rung = new CylinderGeometry(0.055, 0.055, 1, 10);
  for (var i = 0; i < steps; i++) {
    var t = i / (steps - 1), a = t * Math.PI * 2 * turns, y = (t - 0.5) * h;
    var p1 = new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    var p2 = new Vector3(Math.cos(a + Math.PI) * r, y, Math.sin(a + Math.PI) * r);
    var b1 = new Mesh(ball, M.teal); b1.position.copy(p1); g.add(b1);
    var b2 = new Mesh(ball, M.blue); b2.position.copy(p2); g.add(b2);
    var mid = p1.clone().add(p2).multiplyScalar(0.5);
    var half = [M.ceramic, i % 3 === 0 ? M.amber : M.tealSoft];
    [p1, p2].forEach(function (p, k) {
      var m = new Mesh(rung, half[k]);
      var d = p.clone().sub(mid);
      m.scale.y = d.length();
      m.position.copy(mid.clone().add(d.multiplyScalar(0.5)));
      m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), p.clone().sub(mid).normalize());
      g.add(m);
    });
  }
  // backbone tubes
  [0, Math.PI].forEach(function (off, k) {
    var pts = [];
    for (var j = 0; j <= 120; j++) {
      var tt = j / 120, aa = tt * Math.PI * 2 * turns + off;
      pts.push(new Vector3(Math.cos(aa) * r, (tt - 0.5) * h, Math.sin(aa) * r));
    }
    g.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 200, 0.07, 8, false), k ? M.blue : M.teal));
  });
  g.userData = { name: 'DNA · Genetics', spin: 0.35, axis: 'y' };
  return g;
}

function stethoscope(M) {
  var g = new Group();
  // binaural: two ear tubes meeting at a yoke, one long tube to the chest piece
  var earL = [new Vector3(-0.75, 2.2, 0), new Vector3(-0.9, 1.7, 0.1), new Vector3(-0.7, 0.9, 0.1), new Vector3(-0.25, 0.25, 0), new Vector3(0, 0, 0)];
  var earR = earL.map(function (v) { return new Vector3(-v.x, v.y, v.z); });
  var main = [new Vector3(0, 0, 0), new Vector3(0, -0.8, 0.1), new Vector3(0.35, -1.9, 0.3), new Vector3(1.35, -2.4, 0.2), new Vector3(2.1, -1.8, 0), new Vector3(2.15, -0.9, -0.1)];
  [earL, earR].forEach(function (pts) {
    g.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 60, 0.06, 10, false), M.chrome));
    var tip = new Mesh(new SphereGeometry(0.13, 16, 12), M.darkTube); tip.position.copy(pts[0]); g.add(tip);
  });
  g.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(main), 120, 0.1, 12, false), M.darkTube));
  var yoke = new Mesh(new SphereGeometry(0.14, 16, 12), M.chrome); g.add(yoke);
  // chest piece
  var cp = new Group();
  var bell = new Mesh(new CylinderGeometry(0.55, 0.62, 0.28, 40), M.chrome);
  var diaphragm = new Mesh(new CylinderGeometry(0.5, 0.5, 0.04, 40), M.teal); diaphragm.position.y = -0.16;
  var ring = new Mesh(new TorusGeometry(0.56, 0.05, 12, 48), M.chrome); ring.rotation.x = Math.PI / 2; ring.position.y = -0.14;
  var stem = new Mesh(new CylinderGeometry(0.08, 0.1, 0.45, 16), M.chrome); stem.position.y = 0.34;
  cp.add(bell, diaphragm, ring, stem);
  cp.position.copy(main[main.length - 1]).add(new Vector3(0, -0.55, 0));
  cp.rotation.z = 0.25;
  g.add(cp);
  g.userData = { name: 'Stethoscope', spin: 0.25, axis: 'y' };
  return g;
}

function syringe(M) {
  var g = new Group();
  var barrel = new Mesh(new CylinderGeometry(0.32, 0.32, 2.6, 32, 1, true), M.glass);
  var fluid = new Mesh(new CylinderGeometry(0.27, 0.27, 1.5, 28), M.fluid); fluid.position.y = -0.5;
  var stopper = new Mesh(new CylinderGeometry(0.28, 0.28, 0.18, 28), M.darkTube); stopper.position.y = 0.3;
  var rod = new Mesh(new CylinderGeometry(0.07, 0.07, 1.9, 12), M.ceramic); rod.position.y = 1.3;
  var thumb = new Mesh(new CylinderGeometry(0.42, 0.42, 0.08, 32), M.ceramic); thumb.position.y = 2.25;
  var flange = new Mesh(new CylinderGeometry(0.62, 0.62, 0.07, 6), M.ceramic); flange.position.y = 1.3; flange.scale.z = 0.45;
  var tipc = new Mesh(new CylinderGeometry(0.32, 0.12, 0.3, 28), M.glass); tipc.position.y = -1.45;
  var hub = new Mesh(new CylinderGeometry(0.11, 0.11, 0.22, 16), M.teal); hub.position.y = -1.7;
  var needle = new Mesh(new CylinderGeometry(0.018, 0.018, 1.5, 8), M.chrome); needle.position.y = -2.55;
  // dosage marks
  for (var i = 0; i < 6; i++) {
    var mk = new Mesh(new TorusGeometry(0.325, 0.008, 4, 40, Math.PI * 0.5), M.darkTube);
    mk.rotation.x = Math.PI / 2; mk.position.y = -1.1 + i * 0.32; mk.rotation.z = 0.6;
    g.add(mk);
  }
  g.add(barrel, fluid, stopper, rod, thumb, flange, tipc, hub, needle);
  g.userData = { name: 'Syringe', spin: 0.4, axis: 'y' };
  return g;
}

function capsule(M, a, b) {
  var g = new Group(), r = 0.26, len = 0.55;
  var top = new Group();
  top.add(new Mesh(new CylinderGeometry(r, r, len / 2, 24, 1, true), a));
  var c1 = new Mesh(new SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), a); c1.position.y = len / 4; top.add(c1);
  top.position.y = len / 4;
  var bot = new Group();
  bot.add(new Mesh(new CylinderGeometry(r * 1.01, r * 1.01, len / 2, 24, 1, true), b));
  var c2 = new Mesh(new SphereGeometry(r * 1.01, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), b); c2.position.y = -len / 4; bot.add(c2);
  bot.position.y = -len / 4;
  g.add(top, bot);
  g.userData = { name: 'Capsule', spin: 0.9, axis: 'x' };
  return g;
}

function tablet(M, mat) {
  var s = new Shape(); s.absarc(0, 0, 0.36, 0, Math.PI * 2, false);
  var geo = new ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 5, curveSegments: 32 });
  geo.center();
  var m = new Mesh(geo, mat);
  var g = new Group(); g.add(m);
  var line = new Mesh(new CylinderGeometry(0.012, 0.012, 0.6, 6), M.darkTube); line.rotation.z = Math.PI / 2; line.position.z = 0.125; g.add(line);
  g.userData = { name: 'Tablet', spin: 0.7, axis: 'y' };
  return g;
}

function heart(M) {
  var s = new Shape(), x = 0, y = 0;
  s.moveTo(x, y + 0.5);
  s.bezierCurveTo(x, y + 0.5, x - 0.1, y + 1.05, x - 0.75, y + 1.05);
  s.bezierCurveTo(x - 1.6, y + 1.05, x - 1.6, y + 0.05, x - 1.6, y + 0.05);
  s.bezierCurveTo(x - 1.6, y - 0.5, x - 1.0, y - 1.1, x, y - 1.7);
  s.bezierCurveTo(x + 1.0, y - 1.1, x + 1.6, y - 0.5, x + 1.6, y + 0.05);
  s.bezierCurveTo(x + 1.6, y + 0.05, x + 1.6, y + 1.05, x + 0.75, y + 1.05);
  s.bezierCurveTo(x + 0.2, y + 1.05, x, y + 0.5, x, y + 0.5);
  var geo = new ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.28, bevelSegments: 10, curveSegments: 48 });
  geo.center();
  var g = new Group(), m = new Mesh(geo, M.red); g.add(m);
  g.scale.setScalar(0.55);
  g.userData = { name: 'Cardiac Care', spin: 0.3, axis: 'y', pulse: true };
  return g;
}

function cross(M) {
  var w = 0.42, l = 1.1, s = new Shape();
  s.moveTo(-w, l); s.lineTo(w, l); s.lineTo(w, w); s.lineTo(l, w); s.lineTo(l, -w); s.lineTo(w, -w);
  s.lineTo(w, -l); s.lineTo(-w, -l); s.lineTo(-w, -w); s.lineTo(-l, -w); s.lineTo(-l, w); s.lineTo(-w, w); s.closePath();
  var geo = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 6 });
  geo.center();
  var g = new Group(); g.add(new Mesh(geo, M.teal));
  g.scale.setScalar(0.62);
  g.userData = { name: 'Emergency 24×7', spin: 0.5, axis: 'y' };
  return g;
}

function orbit(M, r, mat) {
  var t = new Mesh(new TorusGeometry(r, 0.018, 8, 160), mat);
  t.userData = { orbit: true };
  return t;
}

/* ---------------- Scene presets ---------------- */
function buildHero(scene, M) {
  var items = [];
  function put(obj, pos, rot, scale, label) {
    obj.position.set(pos[0], pos[1], pos[2]);
    if (rot) obj.rotation.set(rot[0], rot[1], rot[2]);
    if (scale) obj.scale.multiplyScalar(scale);
    obj.userData.base = obj.position.clone();
    obj.userData.baseRot = obj.rotation.clone();
    obj.userData.baseScale = obj.scale.x;
    obj.userData.phase = Math.random() * Math.PI * 2;
    obj.userData.label = label;
    scene.add(obj); items.push(obj);
    return obj;
  }
  // the hospital photo card sits in the middle (HTML, above this canvas),
  // so the equipment is arranged around it
  put(dna(M), [-3.55, 0.35, -1.2], [0.1, 0, -0.12], 0.62, 'dna');
  put(stethoscope(M), [-3.1, -2.55, 0.8], [0.25, 0.5, 0.2], 0.62, 'steth');
  put(syringe(M), [3.45, 1.9, -0.2], [0.2, 0, -0.75], 0.66, 'syringe');
  put(heart(M), [3.35, -1.55, 0.9], [0.1, -0.4, 0], 0.9, 'heart');
  if (!small) put(cross(M), [-2.75, 3.35, -0.6], [0.3, 0.4, 0.15], 0.85, null);
  var caps = [[M.teal, M.ceramic], [M.blue, M.ceramic], [M.red, M.ceramic], [M.amber, M.ceramic], [M.teal, M.blue]];
  var capPos = [[0.4, 3.95, 0.6], [1.9, -3.9, 0.4], [3.6, 3.75, -1], [-1.0, -4.0, 1.0], [4.1, -0.1, -1.6]];
  capPos.forEach(function (p, i) {
    if (small && i > 2) return;
    put(capsule(M, caps[i][0], caps[i][1]), p, [Math.random() * 3, Math.random() * 3, Math.random() * 3], 1, null);
  });
  if (!small) {
    put(tablet(M, M.ceramic), [-1.9, 3.9, 1.2], [1.1, 0.3, 0], 1, null);
    put(tablet(M, M.tealSoft), [3.0, -3.55, -1.2], [0.6, 0.8, 0], 1, null);
  }
  var o1 = orbit(M, 3.3, M.tealSoft); o1.rotation.set(1.3, 0.1, 0.2); scene.add(o1);
  var o2 = orbit(M, 3.9, new MeshStandardMaterial({ color: 0x2F6BFF, transparent: true, opacity: 0.35 })); o2.rotation.set(1.05, -0.4, -0.2); scene.add(o2);
  return { items: items, orbits: [o1, o2], camZ: small ? 14.5 : 13.5 };
}

function buildHeart(scene, M) {
  var h = heart(M); h.scale.setScalar(0.95);
  h.userData.base = new Vector3(); h.userData.baseRot = h.rotation.clone(); h.userData.baseScale = h.scale.x; h.userData.phase = 0;
  scene.add(h);
  var o1 = orbit(M, 1.8, new MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); o1.rotation.set(1.3, 0.3, 0);
  var o2 = orbit(M, 2.2, new MeshStandardMaterial({ color: 0x5ED6D3, transparent: true, opacity: 0.6 })); o2.rotation.set(1.0, -0.5, 0.4);
  scene.add(o1, o2);
  var items = [h];
  [[M.ceramic, M.teal], [M.ceramic, M.blue]].forEach(function (c, i) {
    var cp = capsule(M, c[0], c[1]); cp.scale.setScalar(0.8);
    cp.userData.orbitR = 2.0 + i * 0.25; cp.userData.orbitPh = i * Math.PI; cp.userData.baseScale = 0.8;
    scene.add(cp); items.push(cp);
  });
  return { items: items, orbits: [o1, o2], camZ: 7.2 };
}

/* ---------------- Mount ---------------- */
function mount(el) {
  if (el.__med3d) return el.__med3d;
  var canvas = el.querySelector('canvas') || el.appendChild(document.createElement('canvas'));
  var renderer;
  try {
    renderer = new WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { el.classList.add('is-fallback'); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  var scene = new Scene();
  var pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new HemisphereLight(0xffffff, 0xCFE6EA, 0.9));
  var key = new DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  var rim = new DirectionalLight(0x9BE8E4, 1.4); rim.position.set(-6, 2, -4); scene.add(rim);
  scene.add(new AmbientLight(0xffffff, 0.25));

  var M = mats();
  var preset = el.getAttribute('data-med3d') || 'hero';
  var built = preset === 'heart' ? buildHeart(scene, M) : buildHero(scene, M);
  var camera = new PerspectiveCamera(preset === 'heart' ? 38 : 34, 1, 0.1, 100);
  camera.position.set(0, 0, built.camZ);

  var root = { scene: scene };
  var pointer = new Vector2(0, 0), target = new Vector2(0, 0), hovered = null;
  var ray = new Raycaster();
  var tags = {};
  Array.prototype.forEach.call(el.querySelectorAll('[data-tag]'), function (t) { tags[t.getAttribute('data-tag')] = t; });

  function size() {
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole cluster in frame on narrow screens
    camera.position.z = built.camZ * Math.max(1, 1.05 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  size();
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(el); else addEventListener('resize', size);

  var host = el.closest('section') || el;
  host.addEventListener('pointermove', function (e) {
    var r = el.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  });
  host.addEventListener('pointerleave', function () { target.set(0, 0); hovered = null; el.style.cursor = ''; });

  var visible = true, running = false, t0 = performance.now(), last = t0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }, { rootMargin: '100px' }).observe(el);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
  addEventListener('cmch:theme', function () { setTimeout(function () { size(); start(); }, 120); });

  var tmp = new Vector3();
  function frame(now) {
    var active = visible && !document.hidden && el.offsetParent !== null;
    if (!active) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var t = (now - t0) / 1000;
    pointer.lerp(target, 0.06);
    var scrollY = Math.min(1, (window.scrollY || 0) / Math.max(1, innerHeight));

    // hover pick (desktop only)
    if (!small && target.lengthSq() > 0) {
      ray.setFromCamera(target, camera);
      var hit = ray.intersectObjects(built.items, true)[0], obj = null;
      if (hit) { obj = hit.object; while (obj.parent && built.items.indexOf(obj) < 0) obj = obj.parent; }
      if (obj !== hovered) { hovered = obj; el.style.cursor = obj ? 'grab' : ''; }
    }

    built.items.forEach(function (o, i) {
      var u = o.userData, ph = u.phase || 0;
      if (u.orbitR) {
        var a = t * 0.6 + u.orbitPh;
        o.position.set(Math.cos(a) * u.orbitR, Math.sin(a * 1.3) * 0.5, Math.sin(a) * u.orbitR * 0.6);
        o.rotation.x += dt * 1.2; o.rotation.z += dt * 0.8;
        return;
      }
      o.position.y = u.base.y + Math.sin(t * 0.9 + ph) * 0.18 - scrollY * (i % 2 ? 1.2 : 0.6);
      o.position.x = u.base.x + Math.cos(t * 0.6 + ph) * 0.08;
      var sp = (u.spin || 0.3) * (o === hovered ? 4 : 1);
      if (u.axis === 'x') { o.rotation.x += dt * sp; o.rotation.y += dt * sp * 0.6; }
      else o.rotation.y = u.baseRot.y + t * sp * 0.5 + (o === hovered ? Math.sin(t * 6) * 0.05 : 0);
      var s = u.baseScale * (o === hovered ? 1.12 : 1);
      if (u.pulse) { var beat = Math.max(0, Math.sin(t * 7.5)) ** 8 * 0.09 + Math.max(0, Math.sin(t * 7.5 - 0.9)) ** 8 * 0.05; s *= 1 + beat; }
      o.scale.x += (s - o.scale.x) * 0.15; o.scale.y = o.scale.z = o.scale.x;
    });
    built.orbits.forEach(function (r, k) { r.rotation.z += dt * (k ? -0.12 : 0.18); });

    scene.rotation.y = pointer.x * 0.28 + scrollY * 0.5;
    scene.rotation.x = -pointer.y * 0.16;
    renderer.render(scene, camera);

    // HUD labels follow their equipment
    var w = el.clientWidth, h = el.clientHeight;
    built.items.forEach(function (o) {
      var tag = o.userData.label && tags[o.userData.label];
      if (!tag) return;
      o.getWorldPosition(tmp); tmp.project(camera);
      var sx = (tmp.x * 0.5 + 0.5) * w, left = tmp.x < 0;
      tag.classList.toggle('is-left', left);
      tag.style.transform = 'translate(' + (left ? sx - tag.offsetWidth - 22 : sx + 18).toFixed(1) + 'px,' + ((-tmp.y * 0.5 + 0.5) * h - 8).toFixed(1) + 'px)';
    });

    if (reduce) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  start();
  requestAnimationFrame(function () { el.classList.add('is-ready'); });
  el.__med3d = root;
  return root;
}

function mountAll() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-med3d]'), function (el) {
    if (el.offsetParent === null && document.documentElement.getAttribute('data-theme') !== 'medlab') return;
    try { mount(el); } catch (e) { el.classList.add('is-fallback'); if (window.console) console.warn('3D scene off:', e); }
  });
}
window.CMCH3D = { mount: mount, mountAll: mountAll };
mountAll();
addEventListener('cmch:theme', mountAll);
