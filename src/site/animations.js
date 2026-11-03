
// GSAP/ScrollTrigger/Lenis scroll animations and decorations. initAnimations() runs once, right after React renders.
// Moved verbatim from the original index.html page script (React migration); only imports/exports were added.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function initAnimations() {
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    document.body.classList.remove('intro');
    document.body.classList.remove('intro-pending');
    document.querySelector('.backdrop')?.remove();
    return;
  }
  /* ══════════ GSAP / LENIS SETUP ══════════ */
  gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.innerWidth <= 760;

  function splitWords(el) {
    var nodes = Array.from(el.childNodes); el.innerHTML = '';
    nodes.forEach(function (n) {
      if (n.nodeType === 3) { n.textContent.split(/(\s+)/).forEach(function (w) { if (/^\s+$/.test(w)) el.appendChild(document.createTextNode(w)); else if (w) { var s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); } }); }
      else if (n.nodeType === 1) { if (n.tagName === 'BR') el.appendChild(document.createElement('br')); else { var c = n.cloneNode(true); el.appendChild(c); splitWords(c); } }
    });
  }
  document.querySelectorAll('.split').forEach(splitWords);

  document.querySelectorAll('.sq-field').forEach(function (f) {
    var count = parseInt(f.dataset.count) || 16;
    for (var i = 0; i < count; i++) { var sq = document.createElement('div'); sq.className = 'grid-sq'; sq.style.cssText = 'width:46px;height:46px;left:' + (Math.floor(Math.random() * 30) * 48 - 10) + 'px;top:' + (Math.floor(Math.random() * 6) * 48 + 6) + 'px;'; f.appendChild(sq); if (!reduce) gsap.to(sq, { opacity: 0, duration: 1.2, repeat: -1, yoyo: true, delay: Math.random() * 4, repeatDelay: Math.random() * 3, ease: 'sine.inOut' }); }
  });

  var gp = [[3, 64], [3, 71], [6.5, 71], [10, 71], [3, 78], [-1, 70], [44, 56], [48, 52], [52, 55], [86, 58], [86, 67], [82, 70], [88, 72], [86, 78]];
  var hg = document.getElementById('heroGlass');
  gp.forEach(function (p, i) {
    if (isMobile && i % 2 !== 0) return;
    var isC = p[0] > 40 && p[0] < 60; var sz = isC ? 'clamp(28px,3.4vw,44px)' : 'clamp(36px,5.4vw,74px)';
    var sq = document.createElement('div'); sq.className = 'glass'; sq.style.cssText = 'left:' + p[0] + '%;top:' + p[1] + '%;width:' + sz + ';aspect-ratio:1;';
    hg.appendChild(sq); if (!reduce) gsap.to(sq, { opacity: .15, duration: .9, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: Math.random() * 3, repeatDelay: 1 + Math.random() * 3 });
  });

  /* Petals */
  var pe = document.getElementById('petals');
  var pc = ['#d97732', '#bd4f2b', '#e8a642', '#a83f27', '#c66b32', '#e4b85a'];
  for (var i = 0; i < 18; i++) { var p = document.createElement('span'); p.className = 'petal'; var l = Math.random() * 100; var dx = (Math.random() - .5) * 160; var dur = 9 + Math.random() * 9; var del = -(Math.random() * 15); var sc = .6 + Math.random() * .8; p.style.cssText = 'left:' + l + '%;--dx:' + dx + 'px;animation-duration:' + dur + 's;animation-delay:' + del + 's;transform:scale(' + sc + ');background:' + pc[Math.floor(Math.random() * pc.length)] + ';'; pe.appendChild(p); }

  /* Lenis */
  var lenis = new Lenis({ duration: 1.25, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(function (a) { // href="#" links handle their own clicks
    a.addEventListener('click', function (e) { var t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.6 }); } });
  });

  /* ══════════ INTRO ══════════ */
  lenis.stop();
  var hw = document.querySelectorAll('#heroTitle .w,#heroTitle em .w');
  gsap.set(hw, { opacity: 0, y: 24, filter: 'blur(10px)' });
  // Keep the hero covered until its one-time intro animation has its starting styles.
  document.body.classList.remove('intro-pending');
  gsap.timeline({
    delay: .25, onComplete: function () {
      document.body.classList.remove('intro'); gsap.set('#app', { clearProps: 'all' });
      var bd = document.querySelector('.backdrop'); if (bd) bd.remove(); lenis.start(); setupScroll();
      // Arriving from another page via /#section: the browser's own jump happened before the intro settled the layout.
      var hashTarget = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (hashTarget) { ScrollTrigger.refresh(); lenis.scrollTo(hashTarget, { immediate: true }); }
    }
  })
    .fromTo('#app', { scale: .9, borderRadius: 28 }, { scale: 1, borderRadius: 0, duration: 1.4, ease: 'expo.inOut' })
    .to(hw, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: .07, ease: 'power3.out' }, '-=.7')
    .from('.hero-backdrop-title', { opacity: 0, duration: 1.2, ease: 'power3.out', clearProps: 'all' }, '-=.8')
    .from('.cloud-l', { x: -120, opacity: 0, duration: 1.6, ease: 'power3.out' }, .4)
    .from('.cloud-r', { x: 120, opacity: 0, duration: 1.6, ease: 'power3.out' }, .4)
    .from('#heroGlass .glass', { opacity: 0, scale: .6, duration: .6, stagger: { each: .05, from: 'random' }, ease: 'back.out(2)' }, '-=1')
    .from('.hero-3d-card', { y: 90, opacity: 0, scale: .8, rotationX: 25, duration: 1.2, stagger: .1, ease: 'back.out(1.7)' }, '-=.9');

  /* ══════════ SCROLL ══════════ */
  function setupScroll() {
    ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: function (s) { gsap.set('#heroTitle', { yPercent: -60 * s.progress }); document.querySelectorAll('.hero [data-par]').forEach(function (el) { gsap.set(el, { y: parseFloat(el.dataset.par) * 2 * s.progress }); }); gsap.set('#hero3dStage', { yPercent: 16 * s.progress, rotationX: 10 * s.progress }); } });
    document.querySelectorAll('.reveal').forEach(function (el) { gsap.from(el, { opacity: 0, y: 16, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }); });
    document.querySelectorAll('#how .split, #categories .split, #cta .split, #report .split').forEach(function (heading) {
      var words = heading.querySelectorAll('.w');
      if (words.length) {
        gsap.from(words, { opacity: 0, y: 20, filter: 'blur(6px)', duration: .8, stagger: .04, ease: 'power3.out', scrollTrigger: { trigger: heading, start: 'top 85%' } });
      }
    });

    function setCounters(p) {
      document.querySelectorAll('#stats .card').forEach(function (c) {
        var target = parseFloat(c.dataset.to);
        var dec = parseInt(c.dataset.dec) || 0;
        var suf = c.dataset.suf || '';
        var val = (target * p).toFixed(dec);
        c.querySelector('.card-value').textContent = val + suf;
      });
    }

    var statsCounted = false;
    function triggerStatsCounters() {
      if (statsCounted) return;
      statsCounted = true;
      var o = { p: 0 };
      gsap.to(o, {
        p: 1,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function () {
          setCounters(o.p);
        },
        onComplete: function () {
          setCounters(1);
        }
      });
    }

    gsap.from('#stats .stats-heading', {
      opacity: 0,
      y: 28,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#stats',
        start: 'top 85%',
        once: true
      }
    });

    gsap.fromTo('#stats .card',
      { y: 28, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#statsCards',
          start: 'top 85%',
          once: true,
          onEnter: triggerStatsCounters
        }
      }
    );

    gsap.fromTo('#tree',
      { yPercent: 16 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#stats',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2
        }
      }
    );

    var mm = gsap.matchMedia();
    mm.add('(min-width:761px)', function () {
      var panels = document.querySelectorAll('.panel');
      function act(p) { panels.forEach(function (x) { x.classList.remove('is-active') }); p.classList.add('is-active'); }
      panels.forEach(function (p) { p.addEventListener('mouseenter', function () { act(p) }); p.addEventListener('focus', function () { act(p) }); p.addEventListener('click', function () { act(p) }); });
      gsap.from('.panel-in', { y: 120, opacity: 0, duration: 1.1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '#how', start: 'top 60%' } });
      ScrollTrigger.create({ trigger: '#how', start: 'top bottom', end: 'bottom top', scrub: true, onUpdate: function (s) { gsap.set('.loop-cloud', { x: 60 * s.progress }); } });
      return function () { };
    });
    mm.add('(max-width:760px)', function () {
      document.querySelectorAll('.panel>*').forEach(function (el) { gsap.from(el, { y: 40, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }); });
      return function () { };
    });
    ScrollTrigger.create({ trigger: '#cta', start: 'top bottom', end: 'bottom bottom', scrub: true, onUpdate: function (s) { gsap.set('#ctaImg', { yPercent: -12 + 12 * s.progress }); } });
    gsap.from('#ctaCard', { y: 80, scale: .94, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#cta', start: 'top 60%' } });
    ScrollTrigger.refresh();

    /* 3D Civic Characters Parallax & Continuous Levitation */
    init3DStage();
  }
  window.addEventListener('load', function () { if (ScrollTrigger.getAll().length) ScrollTrigger.refresh(); init3DStage(); });

  /* ════════════ 3D CIVIC CHARACTERS STAGE ENGINE (GSAP) ════════════ */
  var _stage3DInitialized = false;
  function init3DStage() {
    if (_stage3DInitialized) return;
    var heroEl = document.getElementById('hero');
    var stageEl = document.getElementById('hero3dStage');
    var cards = document.querySelectorAll('.hero-3d-card');
    if (!heroEl || !stageEl || !cards.length) return;
    _stage3DInitialized = true;

    // Continuous ambient floating for each character figurine (no cursor movement)
    cards.forEach(function (card, idx) {
      var wrap = card.querySelector('.char-img-wrap');
      var ring = card.querySelector('.char-pedestal-ring');
      var shadow = card.querySelector('.char-shadow');
      if (!wrap) return;

      var floatY = (idx % 2 === 0) ? -15 : -9;
      var dur = 2.4 + idx * 0.35;
      var rotZ = (idx % 2 === 0) ? 1.4 : -1.4;

      gsap.to(wrap, {
        y: floatY,
        rotationZ: rotZ,
        duration: dur,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: idx * 0.18
      });

      if (shadow) {
        gsap.to(shadow, {
          scale: 0.88,
          opacity: 0.4,
          duration: dur,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: idx * 0.18
        });
      }

      if (ring) {
        gsap.to(ring, {
          scale: 0.94,
          duration: dur,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: idx * 0.18
        });
      }
    });
  }
  // Trigger immediate stage initialization
  if (document.readyState !== 'loading') {
    init3DStage();
  } else {
    document.addEventListener('DOMContentLoaded', init3DStage);
  }
}

/** The landing page stays mounted while other routes show; re-measure the scroll triggers when it is shown again. */
export function refreshAnimations() {
  ScrollTrigger.refresh();
}
