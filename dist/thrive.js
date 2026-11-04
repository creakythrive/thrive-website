/* Thrive Hyperbaric - shared behaviour
   Nav scroll state + scroll-reveal for .rev elements. Safe to include on every page. */
(function () {
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu toggle
  var burger = document.getElementById('burger');
  if (nav && burger) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    Array.prototype.forEach.call(nav.querySelectorAll('.links a'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  var revs = document.querySelectorAll('.rev:not(.in)');
  if (revs.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revs.forEach(function (el, i) {
      if (!el.style.transitionDelay) el.style.transitionDelay = (Math.min(i % 6, 4) * 45) + 'ms';
      io.observe(el);
    });
  } else {
    revs.forEach(function (el) { el.classList.add('in'); });
  }
})();

/* Lead-source attribution. Remembers where a visitor came from (a partner landing page or a
   ?utm_source= / ?src= link) for 90 days in localStorage, and stamps it into the contact form
   as hidden fields so the enquiry email shows the source. First-party, no third-party sharing. */
(function () {
  var KEY = 'thriveSrc', DAYS = 90;
  var read = function () {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && v.ts && (Date.now() - v.ts) < DAYS * 864e5) return v; } catch (e) {}
    return null;
  };
  var write = function (source, detail) {
    try { localStorage.setItem(KEY, JSON.stringify({ source: source, detail: detail || '', ts: Date.now() })); } catch (e) {}
  };
  var PAGES = { '/jiu-jitsu': 'JIU JITSU LOU' };
  try {
    var path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    var q = new URLSearchParams(location.search);
    var src = q.get('src') || q.get('utm_source');
    if (PAGES[path]) write(PAGES[path], location.pathname + location.search);
    else if (src) write(src, location.pathname + location.search);
  } catch (e) {}
  var f = document.getElementById('enquiry-form');
  if (!f) return;
  var v = read();
  var setHidden = function (name, val) {
    var el = f.querySelector('input[name="' + name + '"]');
    if (!val) { if (el && !el.value) el.parentNode.removeChild(el); return; }
    if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; f.insertBefore(el, f.firstChild); }
    el.value = val;
  };
  if (v && !f.querySelector('input[name="source"][value]')) {
    setHidden('source', v.source);
    setHidden('source_first_seen', new Date(v.ts).toISOString().slice(0, 10) + ' via ' + v.detail);
    var subj = f.querySelector('input[name="subject"]');
    if (subj && subj.value.indexOf(v.source) < 0) subj.value += ' - via ' + v.source;
  }
})();

/* Lazy background images. Elements with data-bg get their image when they come within 400px of
   the viewport, so a phone does not download every section's photo before the page is usable. */
(function () {
  var els = document.querySelectorAll('[data-bg]');
  if (!els.length) return;
  var load = function (el) { el.style.backgroundImage = 'url(' + el.getAttribute('data-bg') + ')'; el.removeAttribute('data-bg'); };
  if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(els, load); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '400px 0px' });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();

/* Project stories. Any element with [data-stories] is filled from stories/stories.json.
   data-tag filters by tag (commercial, home, sport...); data-limit caps the number shown.
   The newest story is shown large, the rest as cards. The section stays hidden if nothing matches. */
(function () {
  var hosts = document.querySelectorAll('[data-stories]');
  if (!hosts.length) return;
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var base = function (s) { return 'stories/' + s.id + '/'; };
  var cover = function (s, i) {
    var m = s.media[0];
    return '<button type="button" class="st-cover" data-open="' + i + '" aria-label="View ' + esc(s.title) + '">' +
      '<img loading="lazy" src="' + base(s) + m.src + '.webp" alt="' + esc(m.alt) + '">' +
      (s.media.length > 1 ? '<span class="count">1 / ' + s.media.length + '</span>' : '') + '</button>';
  };
  var excerpt = function (s) {
    var parts = s.caption.split(/\n\s*\n/).filter(function (p) { return !/^Chamber by|^@|^#/.test(p.trim()); });
    return parts.join('\n\n');
  };
  var view, list = [];
  var openView = function (s) {
    if (!view) {
      view = document.createElement('div'); view.className = 'st-view'; view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true');
      document.body.appendChild(view);
      view.addEventListener('click', function (e) { if (e.target === view || e.target.classList.contains('close')) closeView(); });
      document.addEventListener('keydown', function (e) {
        if (!view.classList.contains('open')) return;
        if (e.key === 'Escape') closeView();
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
      });
    }
    var slides = s.media.map(function (m) {
      var src = base(s) + m.src;
      return '<div class="slide">' + (m.type === 'video'
        ? '<video src="' + src + '.mp4" poster="' + src + '.webp" muted loop playsinline controls preload="none" aria-label="' + esc(m.alt) + '"></video>'
        : '<img loading="lazy" src="' + src + '.jpg" alt="' + esc(m.alt) + '">') + '</div>';
    }).join('');
    view.innerHTML = '<button class="close" aria-label="Close">&times;</button><div class="box"><div class="media"><div class="track">' + slides +
      '</div><span class="ctr">1 / ' + s.media.length + '</span><button class="nav-b prev" aria-label="Previous">&#8249;</button><button class="nav-b next" aria-label="Next">&#8250;</button></div>' +
      '<div class="side"><span class="place">' + esc(s.place) + '</span>' + esc(excerpt(s)) +
      '<div class="row"><a class="st-btn" href="contact.html">Talk to us about your project</a>' +
      '<a class="st-btn ghost" href="' + esc(s.instagram || 'https://www.instagram.com/thrivehyperbaric/') + '" target="_blank" rel="noopener">See more on Instagram</a>' + '</div></div></div>';
    var track = view.querySelector('.track'), ctr = view.querySelector('.ctr');
    var idx = function () { return Math.round(track.scrollLeft / track.clientWidth); };
    track.addEventListener('scroll', function () {
      var i = idx(); ctr.textContent = (i + 1) + ' / ' + s.media.length;
      Array.prototype.forEach.call(track.querySelectorAll('video'), function (v, k) { var on = v.parentNode === track.children[i]; if (on && v.paused) v.play().catch(function () {}); if (!on && !v.paused) v.pause(); });
    }, { passive: true });
    view.querySelector('.prev').onclick = function () { step(-1); };
    view.querySelector('.next').onclick = function () { step(1); };
    view.classList.add('open'); document.body.style.overflow = 'hidden';
    view.querySelector('.close').focus();
  };
  var step = function (d) { var t = view.querySelector('.track'); t.scrollBy({ left: d * t.clientWidth, behavior: 'smooth' }); };
  var closeView = function () { view.classList.remove('open'); view.innerHTML = ''; document.body.style.overflow = ''; };
  fetch('stories/stories.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (all) {
    all.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    Array.prototype.forEach.call(hosts, function (host) {
      var tag = host.getAttribute('data-tag'), lim = +host.getAttribute('data-limit') || 4;
      var items = all.filter(function (s) { return !tag || s.tags.indexOf(tag) > -1; }).slice(0, lim);
      var sec = host.closest('section');
      if (!items.length) { if (sec) sec.hidden = true; return; }
      var html = '', first = items[0], i0 = list.push(first) - 1;
      html += '<div class="st-feature">' + cover(first, i0) + '<div class="st-body"><span class="place">' + esc(first.place) + '</span><h3>' + esc(first.title) + '</h3><p>' +
        esc(excerpt(first)) + '</p><div class="row"><a class="st-btn" href="contact.html">Talk to us</a><a class="st-btn ghost" href="' + esc(first.instagram || 'https://www.instagram.com/thrivehyperbaric/') + '" target="_blank" rel="noopener">See more on Instagram</a></div></div></div>';
      if (items.length > 1) {
        html += '<div class="st-grid">' + items.slice(1).map(function (s) { var i = list.push(s) - 1;
          return '<div class="st-card">' + cover(s, i) + '<span class="place">' + esc(s.place) + '</span><h3>' + esc(s.title) + '</h3></div>'; }).join('') + '</div>';
      }
      host.innerHTML = html;
      if (sec) sec.hidden = false;
      host.addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (b) openView(list[+b.getAttribute('data-open')]); });
    });
  }).catch(function () {});
})();
