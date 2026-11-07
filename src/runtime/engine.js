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
    try { return JSON.parse(el.getAttribute(attr)); } catch (_err) { return null; } // eslint-disable-line no-unused-vars
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
    this.listeners = [];
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

  /** Adds an event listener that destroy() removes. */
  Runtime.prototype.on = function (el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this.listeners.push([el, type, fn, opts]);
  };

  Runtime.prototype.init = function () {
    if (this.active || this.listeners.length) this.destroy();
    this.initForms(); // forms work regardless of motion preferences
    if (this.reducedMotion()) return this;
    this.active = true;
    this.initMagnetic();
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
  /** True when an element, or something inside it, has its own element-level reveal. */
  function ownsReveal(el) {
    return el.hasAttribute('data-dw-el-reveal') || !!el.querySelector('[data-dw-el-reveal]');
  }

  /** Animates a group of elements with one reveal configuration and one observer. */
  Runtime.prototype.revealGroup = function (targets, s) {
    var self = this;
    if (!targets.length) return;
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
    this.observers.push(io);
  };

  Runtime.prototype.initReveal = function () {
    var self = this;
    if (typeof this.win.IntersectionObserver !== 'function') return; // content stays visible
    // Section-level reveals skip elements that have their own reveal, so effects never stack.
    Array.prototype.forEach.call(this.doc.querySelectorAll('[data-dw-reveal]'), function (section) {
      var s = readJson(section, 'data-dw-reveal');
      if (!s) return;
      self.revealGroup(revealTargets(section, s.target).filter(function (el) { return !ownsReveal(el); }), s);
    });
    // Element-level reveals: each element has its own settings and observer.
    Array.prototype.forEach.call(this.doc.querySelectorAll('[data-dw-el-reveal]'), function (el) {
      var s = readJson(el, 'data-dw-el-reveal');
      if (s) self.revealGroup([el], s);
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

  // ---------- Forms ----------
  var FORM_TEXT = {
    missing: 'Please fill in this field.',
    email: 'Enter a valid email address, for example name@example.com.',
    range: function (el) { return 'Enter a number between ' + el.min + ' and ' + el.max + '.'; },
    past: 'Choose a date from today onwards.',
    offline: 'This form is not connected yet, so nothing was sent. Please use the contact details on this page.',
    sending: 'Sending...',
    sent: { inquiry: 'Thank you. Your message was sent.', booking: 'Request sent. This is not a confirmed booking yet: you will receive a reply about availability.' },
    failed: 'Sending failed. Please try again, or use the contact details on this page.'
  };

  function todayIso(win) {
    var d = new win.Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /** Returns an error message for a field, or '' when it is valid. */
  Runtime.prototype.fieldError = function (el) {
    if (el.type === 'date' && el.value && el.value < todayIso(this.win)) return FORM_TEXT.past;
    var v = el.validity;
    if (!v || v.valid) return '';
    if (v.valueMissing) return FORM_TEXT.missing;
    if (v.typeMismatch && el.type === 'email') return FORM_TEXT.email;
    if (v.rangeUnderflow || v.rangeOverflow || v.badInput) return FORM_TEXT.range(el);
    return el.validationMessage || FORM_TEXT.missing;
  };

  Runtime.prototype.showFieldError = function (el) {
    var msg = this.fieldError(el);
    var out = this.doc.getElementById(el.id + '-err');
    if (out) out.textContent = msg;
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    return !msg;
  };

  Runtime.prototype.initForms = function () {
    var self = this;
    Array.prototype.forEach.call(this.doc.querySelectorAll('form[data-dw-form]'), function (form) {
      var kind = form.getAttribute('data-dw-form') === 'booking' ? 'booking' : 'inquiry';
      var endpoint = form.getAttribute('data-dw-endpoint');
      var status = form.querySelector('.dw-form-status');
      var button = form.querySelector('button[type="submit"]');
      var fields = Array.prototype.slice.call(form.querySelectorAll('input[id], textarea[id]'));
      var dateField = form.querySelector('input[type="date"]');
      if (dateField) dateField.min = todayIso(self.win);
      // Real-time validation: after a field has been left once, re-check on every keystroke.
      fields.forEach(function (el) {
        self.on(el, 'blur', function () { el.setAttribute('data-dw-touched', ''); self.showFieldError(el); });
        self.on(el, 'input', function () { if (el.hasAttribute('data-dw-touched')) self.showFieldError(el); });
      });
      self.on(form, 'submit', function (e) {
        e.preventDefault();
        var firstBad = null;
        fields.forEach(function (el) { el.setAttribute('data-dw-touched', ''); if (!self.showFieldError(el) && !firstBad) firstBad = el; });
        if (firstBad) { firstBad.focus(); return; }
        var trap = form.querySelector('input[name="company_website"]');
        if (trap && trap.value) return; // bot: drop silently, never show a fake success
        if (!endpoint) { status.textContent = FORM_TEXT.offline; return; }
        button.disabled = true;
        status.textContent = FORM_TEXT.sending;
        self.win.fetch(endpoint, { method: 'POST', body: new self.win.FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            status.textContent = FORM_TEXT.sent[kind];
            form.reset();
            fields.forEach(function (el) { el.removeAttribute('data-dw-touched'); el.removeAttribute('aria-invalid'); });
          })
          .catch(function () { status.textContent = FORM_TEXT.failed; })
          .then(function () { button.disabled = false; });
      });
    });
  };

  // ---------- Magnetic buttons ----------
  Runtime.prototype.initMagnetic = function () {
    var self = this;
    if (!this.doc.body || !this.doc.body.hasAttribute('data-dw-magnetic')) return;
    var fine = this.win.matchMedia && this.win.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine || !fine.matches) return; // touch screens: no cursor effects
    Array.prototype.forEach.call(this.doc.querySelectorAll('.dw-btn'), function (btn) {
      btn.classList.add('dw-magnet');
      self.touched.push({ el: btn, cls: 'dw-magnet', vars: [] });
      self.on(btn, 'pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * 0.25;
        var y = (e.clientY - (r.top + r.height / 2)) * 0.35;
        btn.style.transform = 'translate3d(' + clamp(x, -12, 12).toFixed(1) + 'px,' + clamp(y, -8, 8).toFixed(1) + 'px,0)';
      });
      self.on(btn, 'pointerleave', function () { btn.style.transform = ''; });
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
    this.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    this.listeners = [];
    this.touched.forEach(function (t) {
      t.el.classList.remove(t.cls, 'dw-in');
      if (t.cls === 'dw-magnet') t.el.style.transform = '';
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
