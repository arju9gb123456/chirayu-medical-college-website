#!/usr/bin/env python3
"""
Builds page.html (the template every inner page uses) from index.html,
so the top bar, menu, mobile drawer and footer are always identical.

Run after changing the menu/footer in index.html:
    python3 tools/build_page_shell.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()


def between(start, end, include_end=False):
    a = src.index(start)
    b = src.index(end, a)
    return src[a:b + (len(end) if include_end else 0)]


def absolutize(html):
    """Inner pages live at /<slug>/, so every site link must start with '/'."""
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if val == '':
            return '%s="/"' % attr
        if re.match(r'^(https?:|mailto:|tel:|#|/|data:|javascript:)', val):
            return m.group(0)
        return '%s="/%s"' % (attr, val)
    return re.sub(r'\b(href|src)="([^"]*)"', fix, html)


head = between('<head>', '</head>', include_end=True)
head = re.sub(r'<title>.*?</title>', '<title>Chirayu Medical College &amp; Hospital</title>', head, flags=re.S)
head = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="Chirayu Medical College &amp; Hospital, Bhopal.">', head)
head = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', head, flags=re.S)
head = re.sub(r'<link rel="canonical"[^>]*>\n', '', head)
head = re.sub(r'<meta property="og:[^>]*>\n', '', head)
head = head.replace('href="assets/', 'href="/assets/')

sprite = between('<!-- Icon sprite -->', '<div class="loader"')
chrome = between('<a class="skip"', '<main id="main">')
chrome = chrome.replace(' aria-current="page"', '').replace('<a class="brand" href="#"', '<a class="brand" href="/"')
footer = between('<!-- ===== FOOTER', '<script src=')

scripts = re.findall(r'<script src="assets/[^"]+"[^>]*></script>', src)
scripts = [s.replace('assets/js/main.js', 'assets/js/page.js') for s in scripts]
version = re.search(r'main\.js\?v=([\w-]+)', src)
page_js = 'assets/js/page.js?v=%s' % (version.group(1) if version else '1')
scripts = [re.sub(r'assets/js/page\.js(\?v=[\w-]+)?', page_js, s) for s in scripts]

html = '''<!DOCTYPE html>
<html lang="en" data-theme="cinema">
%s
<body class="is-inner">

%s
%s
<main id="main" class="page" data-page-root>
  <section class="phero phero--loading" aria-busy="true"><div class="wrap"><div class="sk sk--title"></div><div class="sk sk--line"></div></div></section>
</main>

<!-- Photo viewer -->
<div class="lbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
  <button class="lbox__close" aria-label="Close"><svg><use href="#i-close"/></svg></button>
  <button class="lbox__nav lbox__nav--prev" aria-label="Previous photo"><svg><use href="#i-left"/></svg></button>
  <figure><img src="data:," alt=""><figcaption></figcaption></figure>
  <button class="lbox__nav lbox__nav--next" aria-label="Next photo"><svg><use href="#i-right"/></svg></button>
</div>

%s
%s
</body>
</html>
''' % (absolutize(head), sprite, absolutize(chrome), absolutize(footer),
       '\n'.join(absolutize(s) for s in scripts))

out = os.path.join(ROOT, 'page.html')
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html), 'bytes')
