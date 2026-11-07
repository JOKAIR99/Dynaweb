/* Dynaweb runtime: parallax, scroll reveal and horizontal scroll.
 * Dependency-free; shipped inline in every exported site and in the editor canvas.
 * Rules: content is fully visible without this script; reduced motion disables
 * every effect; one passive scroll listener drives all scroll-linked effects
 * through a single requestAnimationFrame; only transform/opacity/filter/clip-path animate. */
(function (global) {
  'use strict';

  var EASE = {
    'linear': 'linear', 'ease': 'ease', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out',
    'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)', 'back-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  };
  var MOBILE_MAX = 767;

  function readJson(el, attr) {
    try { return JSON.parse(el.getAttribute(attr)); } catch (e) { return null; }
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /** Initial (hidden) state for a reveal effect, as CSS custom properties. */
  function revealVars(s) {
    var d = s.distance + 'px';
    var t = 'none', f = 'none', c = 'none';
    switch (s.effect) {
      case 'slide-up': t = 'translate3d(0,' + d + ',0)'; break;
      case 'slide-down': t = 'translate3d(0,-' + d + ',0)'; break;
      case 'slide-left': t = 'translate3d(' + d + ',0,0)'; break;
      case 'slide-right': t = 'translate3d(-' + d + ',0,0)'; break;
      case 'zoom-in': t = 'scale(' + s.initialScale + ')'; break;
      case 'zoom-out': t = 'scale(' + (2 - s.initialScale) + ')'; break;
      case 'scale': t = 'scale(' + s.initialScale + ') translate3d(0,' + d + ',0)'; break;
      case 'rotate': t = 'rotate(' + s.rotation + 'deg) translate3d(0,' + d + ',0)'; break;
      case 'blur': f = 'blur(12px)'; break;
      case 'clip': c = 'inset(0 0 100% 0)'; break;
    }
    return { '--dw-rv-t': t, '--dw-rv-f': f, '--dw-rv-c': c, '--dw-rv-o': String(s.initialOpacity) };
  }

  function revealTargets(section, target) {
    var inner = section.querySelector('.dw-inner') || section;
    var q = function (sel) { return Array.prototype.slice.call(section.querySelectorAll(sel)); };
    switch (target) {
      case 'section': return [inner];
      case 'headings': return q('h1, h2, h3');
      case 'images': return q('.dw-media');
      case 'buttons': return q('.dw-btn');
      case 'cards': return q('.dw-card, .dw-h-panel');
      default: {
        var kids = Array.prototype.slice.call(inner.children);
        if (kids.length === 1 && kids[0].children.length > 1) kids = Array.prototype.slice.call(kids[0].children);
        return kids;
      }
    }
  }

  function Runtime(doc) {
    this.doc = doc;
    this.win = doc.defaultView;
    this.observers = [];
    this.parallax = [];
    this.horizontal = [];
    this.touched = [];
    this.mouse = { x: 0, y: 0 };
    this.frame = 0;
    this.snapTimer = 0;
    this.active = false;
    var self = this;
    this.onScroll = function () { self.schedule(); };
    this.onResize = function () { self.measure(); self.schedule(); };
    this.onMouse = function (e) {
      self.mouse.x = e.clientX / self.win.innerWidth - 0.5;
      self.mouse.y = e.clientY / self.win.innerHeight - 0.5;
      self.schedule();
    };
  }

  Runtime.prototype.reducedMotion = function () {
    var mq = this.win.matchMedia && this.win.matchMedia('(prefers-reduced-motion: reduce)');
    return !!(mq && mq.matches) || (this.doc.body && this.doc.body.getAttribute('data-dw-motion') === 'none');
  };

  Runtime.prototype.init = function () {
    if (this.active) this.destroy();
    if (this.reducedMotion()) return this;
    this.active = true;
    this.doc.documentElement.classList.add('dw-js');
    this.initReveal();
    this.initParallax();
    this.initHorizontal();
    if (this.parallax.length || this.horizontal.length) {
      this.win.addEventListener('scroll', this.onScroll, { passive: true });
      this.win.addEventListener('resize', this.onResize, { passive: true });
    }
    if (this.parallax.some(function (p) { return p.s.mouseInteraction; })) {
      this.win.addEventListener('mousemove', this.onMouse, { passive: true });
    }
    this.measure();
    this.update();
    return this;
  };

  Runtime.prototype.mark = function (el, cls, vars) {
    el.classList.add(cls);
    for (var k in vars) el.style.setProperty(k, vars[k]);
    this.touched.push({ el: el, cls: cls, vars: Object.keys(vars) });
  };

  // ---------- Scroll reveal ----------
  Runtime.prototype.initReveal = function () {
    var self = this;
    var sections = this.doc.querySelectorAll('[data-dw-reveal]');
    if (!sections.length) return;
    if (typeof this.win.IntersectionObserver !== 'function') return; // content stays visible
    Array.prototype.forEach.call(sections, function (section) {
      var s = readJson(section, 'data-dw-reveal');
      if (!s) return;
      var targets = revealTargets(section, s.target);
      var fadeOut = s.effect === 'fade-out';
      targets.forEach(function (el, i) {
        var vars = revealVars(s);
        vars['--dw-rv-dur'] = s.duration + 'ms';
        vars['--dw-rv-delay'] = (s.delay + i * s.stagger) + 'ms';
        vars['--dw-rv-ease'] = EASE[s.easing] || 'ease-out';
        self.mark(el, 'dw-rv', vars);
        if (fadeOut) el.classList.add('dw-in');
      });
      var io = new self.win.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (fadeOut) {
            // Visible while on screen; fades once it has scrolled past the top.
            if (!entry.isIntersecting && entry.boundingClientRect.top < 0) el.classList.remove('dw-in');
            else el.classList.add('dw-in');
            return;
          }
          if (entry.isIntersecting) {
            el.classList.add('dw-in');
            if (s.once) io.unobserve(el);
          } else if (!s.once) {
            el.classList.remove('dw-in');
          }
        });
      }, { threshold: clamp(s.threshold, 0, 1), rootMargin: '0px 0px -5% 0px' });
      targets.forEach(function (el) { io.observe(el); });
      self.observers.push(io);
    });
  };

  // ---------- Parallax ----------
  Runtime.prototype.initParallax = function () {
    var self = this;
    Array.prototype.forEach.call(this.doc.querySelectorAll('[data-dw-parallax]'), function (section) {
      var s = readJson(section, 'data-dw-parallax');
      if (!s) return;
      var layers = Array.prototype.map.call(section.querySelectorAll('.dw-plx-layer'), function (el) {
        return { el: el, speed: parseFloat(el.getAttribute('data-dw-speed')) || 0 };
      });
      var inner = section.querySelector('.dw-inner');
      if (inner) layers.push({ el: inner, speed: -s.speed * s.depth * 0.4, content: true });
      if (s.perspective > 0) section.style.perspective = s.perspective + 'px';
      self.parallax.push({ section: section, s: s, layers: layers });
    });
  };

  Runtime.prototype.updateParallax = function (vh) {
    var mx = this.mouse.x, my = this.mouse.y;
    this.parallax.forEach(function (p) {
      var r = p.section.getBoundingClientRect();
      if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) return; // off screen: skip work
      var progress = (r.top + r.height / 2 - vh / 2) / vh; // 0 when centred
      var amp = vh * 0.5 * (0.5 + p.s.depth);
      p.layers.forEach(function (layer) {
        var off = -progress * amp * layer.speed;
        var mxOff = p.s.mouseInteraction ? mx * 40 * p.s.mouseStrength * layer.speed : 0;
        var myOff = p.s.mouseInteraction ? my * 40 * p.s.mouseStrength * layer.speed : 0;
        var x = p.s.direction === 'vertical' ? mxOff : off + mxOff;
        var y = p.s.direction === 'horizontal' ? myOff : off + myOff;
        var scale = layer.content ? '' : ' scale(' + p.s.scale + ')';
        layer.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' + scale;
      });
    });
  };

  // ---------- Horizontal scroll ----------
  Runtime.prototype.initHorizontal = function () {
    var self = this;
    Array.prototype.forEach.call(this.doc.querySelectorAll('[data-dw-horizontal]'), function (section) {
      var s = readJson(section, 'data-dw-horizontal');
      var track = section.querySelector('.dw-h-track');
      if (!s || !track) return;
      self.horizontal.push({ section: section, s: s, track: track, distance: 0, enabled: false,
        panels: track.querySelectorAll('.dw-h-panel'), dots: section.querySelectorAll('.dw-h-dots i'),
        bar: section.querySelector('.dw-h-progress') });
    });
  };

  Runtime.prototype.measure = function () {
    var win = this.win;
    var mobile = win.innerWidth <= MOBILE_MAX;
    this.horizontal.forEach(function (h) {
      h.enabled = !mobile;
      h.section.classList.toggle('dw-h-active', h.enabled);
      if (!h.enabled) {
        h.section.style.height = '';
        h.track.style.transform = '';
        return;
      }
      h.distance = Math.max(0, h.track.scrollWidth - win.innerWidth);
      h.section.style.height = (win.innerHeight + h.distance / h.s.speed) + 'px';
    });
  };

  Runtime.prototype.updateHorizontal = function (vh) {
    var self = this;
    this.horizontal.forEach(function (h) {
      if (!h.enabled) return;
      var r = h.section.getBoundingClientRect();
      var span = r.height - vh;
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      var x = h.s.direction === 'rtl' ? -(1 - p) * h.distance : -p * h.distance;
      h.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      h.section.style.setProperty('--dw-h-p', p.toFixed(4));
      var n = h.panels.length;
      var current = n > 1 ? Math.round(p * (n - 1)) : 0;
      Array.prototype.forEach.call(h.dots, function (d, i) { d.classList.toggle('on', i === current); });
      h.progress = p;
    });
    if (this.horizontal.some(function (h) { return h.enabled && h.s.snap; })) {
      this.win.clearTimeout(this.snapTimer);
      this.snapTimer = this.win.setTimeout(function () { self.snap(vh); }, 160);
    }
  };

  Runtime.prototype.snap = function (vh) {
    var win = this.win;
    this.horizontal.forEach(function (h) {
      if (!h.enabled || !h.s.snap || h.progress <= 0 || h.progress >= 1) return;
      var n = h.panels.length;
      if (n < 2) return;
      var target = Math.round(h.progress * (n - 1)) / (n - 1);
      var r = h.section.getBoundingClientRect();
      var top = win.scrollY + r.top + target * (r.height - vh);
      if (Math.abs(top - win.scrollY) > 2) win.scrollTo({ top: top, behavior: 'smooth' });
    });
  };

  // ---------- Frame loop ----------
  Runtime.prototype.schedule = function () {
    if (this.frame || !this.active) return;
    var self = this;
    this.frame = this.win.requestAnimationFrame(function () { self.frame = 0; self.update(); });
  };

  Runtime.prototype.update = function () {
    var vh = this.win.innerHeight;
    this.updateParallax(vh);
    this.updateHorizontal(vh);
  };

  Runtime.prototype.destroy = function () {
    this.win.removeEventListener('scroll', this.onScroll);
    this.win.removeEventListener('resize', this.onResize);
    this.win.removeEventListener('mousemove', this.onMouse);
    if (this.frame) this.win.cancelAnimationFrame(this.frame);
    this.win.clearTimeout(this.snapTimer);
    this.observers.forEach(function (io) { io.disconnect(); });
    this.touched.forEach(function (t) {
      t.el.classList.remove(t.cls, 'dw-in');
      t.vars.forEach(function (v) { t.el.style.removeProperty(v); });
    });
    this.parallax.forEach(function (p) { p.layers.forEach(function (l) { l.el.style.transform = ''; }); p.section.style.perspective = ''; });
    this.horizontal.forEach(function (h) {
      h.section.classList.remove('dw-h-active');
      h.section.style.height = '';
      h.track.style.transform = '';
    });
    this.doc.documentElement.classList.remove('dw-js');
    this.observers = []; this.parallax = []; this.horizontal = []; this.touched = [];
    this.frame = 0; this.active = false;
  };

  var api = {
    create: function (doc) { return new Runtime(doc); },
    instance: null,
    start: function (doc) {
      if (api.instance) api.instance.destroy();
      api.instance = new Runtime(doc || global.document).init();
      return api.instance;
    }
  };
  global.DynawebRuntime = api;

  if (global.document && !global.__DW_NO_AUTOSTART__) {
    var go = function () { api.start(global.document); };
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', go);
    else go();
    var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.addEventListener) mq.addEventListener('change', go);
  }
})(typeof window !== 'undefined' ? window : this);
