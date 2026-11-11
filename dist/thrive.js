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

/* Google Ads click ID. When a visitor arrives from an ad (?gclid=, or ?gbraid= / ?wbraid= on iOS),
   keeps the click ID for 90 days in localStorage, the same way as the source attribution above,
   and adds it to the enquiry form as one hidden "ref" field. The daily Ads task reads it from the
   enquiry email and uploads it to Google Ads as an offline conversion, whatever the visitor chose
   on the cookie banner. */
(function () {
  var KEY = 'thriveClick', DAYS = 90;
  try {
    var q = new URLSearchParams(location.search), id = null, type = null;
    ['gclid', 'gbraid', 'wbraid'].some(function (k) { var v = q.get(k); if (v) { id = v; type = k; } return !!v; });
    if (id) localStorage.setItem(KEY, JSON.stringify({ id: id, type: type, page: location.pathname, ts: Date.now() }));
  } catch (e) {}
  var f = document.getElementById('enquiry-form');
  if (!f) return;
  var c = null;
  try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && (!c.ts || (Date.now() - c.ts) > DAYS * 864e5)) c = null; } catch (e) { c = null; }
  if (!c || !c.id) return;
  /* One small, unlabelled line at the bottom of the enquiry email: "ref : <click id>".
     gbraid/wbraid IDs get a "b:" or "w:" prefix so the upload knows which type it is. */
  var el = f.querySelector('input[name="ref"]');
  if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = 'ref'; f.appendChild(el); }
  el.value = (c.type === 'gclid' ? '' : c.type.charAt(0) + ':') + c.id;
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
