(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.getElementById('siteHeader');
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var waBar = document.getElementById('waBar');
  var year = document.getElementById('year');
  var menuOpen = false;
  var lastFocused = null;

  if (year) year.textContent = new Date().getFullYear();

  /* Image hygiene: never publish empty gallery frames or broken media. */
  var images = Array.prototype.slice.call(document.querySelectorAll('img'));
  images.forEach(function (img) {
    function failed() {
      var slot = img.closest('.slot');
      var serviceVisual = img.closest('.sv-scope');
      var heroFrame = img.closest('.hero__frame');
      var aboutPortrait = img.closest('.about__portrait');
      var contactBackground = img.closest('.contact__bg');

      if (slot) slot.remove();
      else if (serviceVisual) serviceVisual.remove();
      else if (heroFrame) heroFrame.classList.add('image-unavailable');
      else if (aboutPortrait) aboutPortrait.classList.add('image-unavailable');
      else if (contactBackground) contactBackground.remove();

      updateEmptyWork();
      refreshScroll();
    }

    img.addEventListener('error', failed, { once: true });
    img.addEventListener('load', refreshScroll, { once: true });
    if (img.complete && img.naturalWidth === 0) failed();
  });

  function updateEmptyWork() {
    var grid = document.getElementById('workGrid');
    var empty = document.getElementById('workEmpty');
    if (!grid || !empty) return;
    var hasWork = grid.querySelectorAll('.slot').length > 0;
    empty.hidden = hasWork;
    grid.hidden = !hasWork;
  }
  updateEmptyWork();

  /* Accessible mobile navigation with focus restoration and keyboard support. */
  function setMenu(open, restoreFocus) {
    if (!nav || !toggle || menuOpen === open) return;
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    var label = toggle.querySelector('.nav-toggle__label');
    if (label) label.textContent = open ? 'CLOSE' : 'MENU';

    if (open) {
      lastFocused = document.activeElement;
      var firstLink = nav.querySelector('a');
      if (firstLink) firstLink.focus({ preventScroll: true });
    } else if (restoreFocus !== false) {
      (lastFocused && typeof lastFocused.focus === 'function' ? lastFocused : toggle).focus({ preventScroll: true });
    }
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!menuOpen); });
    nav.addEventListener('click', function (event) {
      if (event.target === nav || event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (!menuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820 && menuOpen) setMenu(false, false);
    }, { passive: true });
  }

  /* Header state is kept independent of GSAP so the site remains functional without it. */
  var scrollTicking = false;
  function onScroll() {
    if (header) header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
    scrollTicking = false;
  }
  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      window.requestAnimationFrame(onScroll);
      scrollTicking = true;
    }
  }, { passive: true });
  onScroll();

  /* Persistent mobile enquiry action: reveal after the hero, hide over contact. */
  if ('IntersectionObserver' in window && waBar) {
    var pastHero = false;
    var atContact = false;
    var updateBar = function () {
      waBar.classList.toggle('is-visible', pastHero && !atContact);
    };
    var hero = document.querySelector('.hero');
    var panel = document.querySelector('.panel');
    if (hero) new IntersectionObserver(function (entries) {
      var entry = entries[0];
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      updateBar();
    }, { threshold: 0.05 }).observe(hero);
    if (panel) new IntersectionObserver(function (entries) {
      atContact = entries[0].isIntersecting;
      updateBar();
    }, { threshold: 0.2 }).observe(panel);
  }

  /* Motion enhancement. All content remains visible if GSAP is unavailable. */
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var q = function (selector) { return gsap.utils.toArray(selector); };
  var heroImage = document.querySelector('.hero__img');

  function refreshScroll() {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function startMotion() {
    if (startMotion.started) return;
    startMotion.started = true;

    /* The opening sequence: image first, typography follows, metadata closes. */
    var opening = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (heroImage && heroImage.naturalWidth) {
      opening.from(heroImage, { opacity: 0, scale: 1.07, duration: 1.65, ease: 'power2.out' }, 0);
    }
    opening
      .from('.hero__title .line', { yPercent: 110, duration: 1.05, stagger: 0.13 }, 0.28)
      .from('.hero__name .line', { yPercent: 105, duration: 1.25 }, 0.52)
      .from('.hero__meta', { opacity: 0, y: 14, duration: 0.8 }, 1.02)
      .from('.hero__scroll', { opacity: 0, y: 8, duration: 0.65 }, 1.22);

    /* The opening portrait hands the visitor into the work section. */
    var heroHandoff = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.7,
        invalidateOnRefresh: true
      }
    });
    if (heroImage && heroImage.naturalWidth) {
      heroHandoff.to(heroImage, { scale: 1.1, yPercent: 5, ease: 'none' }, 0);
    }
    heroHandoff
      .to('.hero__title', { y: -55, opacity: 0, ease: 'none' }, 0)
      .to('.hero__meta', { opacity: 0, y: -15, ease: 'none' }, 0)
      .to('.hero__name', { xPercent: -5, ease: 'none' }, 0);

    /* Portfolio images settle as they enter and leave the viewport. */
    q('.slot__media img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.12, yPercent: -2 }, {
        scale: 1, yPercent: 2, ease: 'none',
        scrollTrigger: { trigger: img.closest('.slot'), start: 'top bottom', end: 'bottom top', scrub: 0.65 }
      });
    });

    /* Editorial line reveals. */
    ['.about__title', '.contact__title'].forEach(function (selector) {
      if (!document.querySelector(selector)) return;
      gsap.from(selector + ' .line', {
        yPercent: 110, duration: 0.95, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: selector, start: 'top 82%', once: true }
      });
    });

    /* Portrait shutter reveal. */
    if (document.querySelector('.about__portrait')) {
      gsap.from('.about__portrait', {
        clipPath: 'inset(0 0 100% 0)', duration: 1.15, ease: 'power3.inOut',
        scrollTrigger: { trigger: '.about__portrait', start: 'top 82%', once: true }
      });
    }

    /* Service visuals have distinct, restrained motion. */
    if (document.querySelector('.sv-frame')) {
      gsap.from('.sv-frame', {
        opacity: 0, scale: 0.96, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: '.sv-frame', start: 'top 86%', once: true }
      });
    }
    if (document.querySelector('.sv-scope')) {
      gsap.fromTo('.playhead', { left: '0%' }, {
        left: '100%', ease: 'none',
        scrollTrigger: { trigger: '.sv-scope', start: 'top 86%', end: 'bottom 25%', scrub: true }
      });
    }
    q('.sv-timeline .track').forEach(function (track, index) {
      gsap.from(track.children, {
        xPercent: function (position) { return (position % 2 ? 1 : -1) * (28 + index * 12); },
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.sv-timeline', start: 'top 90%', end: 'center 58%', scrub: true }
      });
    });

    refreshScroll();
  }

  /* Wait for the hero asset to settle; never animate an empty image frame. */
  if (heroImage && !heroImage.complete) {
    heroImage.addEventListener('load', startMotion, { once: true });
    heroImage.addEventListener('error', startMotion, { once: true });
    window.setTimeout(startMotion, 1400);
  } else {
    startMotion();
  }

  /* Lazy images can alter layout after the first ScrollTrigger measurement. */
  images.forEach(function (img) {
    if (!img.complete) {
      img.addEventListener('load', refreshScroll, { once: true });
      img.addEventListener('error', refreshScroll, { once: true });
    }
  });
  window.addEventListener('load', refreshScroll, { once: true });
  window.addEventListener('pageshow', refreshScroll);
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(function () { refreshScroll(); });
    var work = document.getElementById('work');
    var about = document.getElementById('about');
    if (work) observer.observe(work);
    if (about) observer.observe(about);
  }
})();