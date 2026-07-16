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
