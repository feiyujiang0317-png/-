/* ================================================
   effects.js — 侨批数字展馆 · 特效与动画
   ================================================ */

const Effects = {
  /**
   * Initialize paper texture overlay
   */
  initPaperOverlay: function() {
    const overlay = document.getElementById('paper-overlay');
    if (overlay) {
      overlay.style.display = 'block';
    }
  },

  /**
   * Create radial gradient lantern glow
   * @param {HTMLElement} container - Container element
   * @param {number} xPercent - X center position (%)
   * @param {number} yPercent - Y center position (%)
   * @param {string} color - Glow color (CSS rgba)
   */
  createLanternGlow: function(container, xPercent, yPercent, color) {
    if (!container) return;
    const glow = document.createElement('div');
    glow.className = 'lantern-glow-effect';
    glow.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(
        ellipse at ${xPercent || 50}% ${yPercent || 40}%,
        ${color || 'rgba(212,165,116,0.25)'} 0%,
        rgba(44,24,16,0.3) 50%,
        rgba(44,24,16,0.7) 100%
      );
      z-index: 1;
    `;
    container.appendChild(glow);
  },

  /**
   * Fade in an element
   * @param {HTMLElement} el
   * @param {number} duration - in ms
   * @returns {Promise}
   */
  fadeInElement: function(el, duration) {
    return new Promise(function(resolve) {
      if (!el) { resolve(); return; }
      el.style.opacity = 0;
      el.style.display = 'block';
      el.style.transition = 'opacity ' + (duration || 800) + 'ms ease';
      requestAnimationFrame(function() {
        el.style.opacity = 1;
      });
      setTimeout(resolve, duration || 800);
    });
  },

  /**
   * Stagger elements entrance
   * @param {HTMLElement[]|NodeList} elements
   * @param {number} delay - stagger delay in ms
   */
  staggerElements: function(elements, delay) {
    if (!elements || elements.length === 0) return;
    Array.from(elements).forEach(function(el, index) {
      setTimeout(function() {
        el.classList.add('card-slide-up');
        el.style.opacity = '1';
      }, index * (delay || 500));
    });
  },

  /**
   * Typewriter effect (for subtle text reveal)
   * @param {HTMLElement} el
   * @param {string} text
   * @param {number} speed - ms per char
   * @returns {Promise}
   */
  typewriter: function(el, text, speed) {
    return new Promise(function(resolve) {
      if (!el) { resolve(); return; }
      el.textContent = '';
      el.style.visibility = 'visible';
      var i = 0;
      var interval = setInterval(function() {
        el.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed || 50);
    });
  },

  /**
   * Create floating particles (for starry sky effect)
   * @param {HTMLElement} container
   * @param {number} count
   */
  createStars: function(container, count) {
    if (!container) return;
    var containerW = container.offsetWidth || 1920;
    var containerH = container.offsetHeight || 1080;

    for (var i = 0; i < (count || 60); i++) {
      var star = document.createElement('div');
      var size = Math.random() * 3 + 1;
      var x = Math.random() * 100;
      var y = Math.random() * 100;
      var delay = Math.random() * 4;
      var duration = Math.random() * 3 + 2;

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 215, 0, ${Math.random() * 0.6 + 0.2});
        border-radius: 50%;
        animation: twinkle ${duration}s ease-in-out ${delay}s infinite;
        pointer-events: none;
        z-index: 0;
      `;
      container.appendChild(star);
    }
  },

  /**
   * Animate data flow (zone 8) — data points flow up
   * @param {HTMLElement} container
   */
  animateDataFlow: function(container) {
    if (!container) return;
    var items = container.querySelectorAll('.data-point');
    if (items.length === 0) return;
    Array.from(items).forEach(function(item, index) {
      setTimeout(function() {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, 400 + index * 300);
    });
  },

  /**
   * Wave animation (zone 6)
   * @param {HTMLElement} container
   */
  animateWaves: function(container) {
    if (!container) return;
    var waves = container.querySelectorAll('.ocean-wave');
    Array.from(waves).forEach(function(wave) {
      wave.classList.add('wave-move');
    });
  },

  // ==================================================================
  //  Zone 3 — 「難」字页视差交互 & 震动特效
  // ==================================================================

  /**
   * 初始化「難」字页的视差效果
   * 监听鼠标移动，为不同深度的元素施加反向位移偏移，
   * 模拟海上漂泊、站不稳的动荡感。
   * @param {HTMLElement} zone3El - zone-3 页面根元素
   */
  initZone3Parallax: function(zone3El) {
    if (!zone3El) return;

    var bgLayer  = zone3El.querySelector('.parallax-layer-bg');
    var midLayer = zone3El.querySelector('.parallax-layer-mid');
    var fgLayer  = zone3El.querySelector('.parallax-layer-fg');
    var charEl   = zone3El.querySelector('.nan-character-display');

    // 如果没有专用层，就把 body 文字当作 mid 层处理
    var defaultBg  = zone3El.querySelector('.diff-emotion-words');
    var defaultMid = zone3El.querySelector('.diff-sections');
    var defaultFg  = zone3El.querySelector('.diff-quote-wrapper');

    var bg  = bgLayer  || defaultBg;
    var mid = midLayer || defaultMid;
    var fg  = fgLayer  || defaultFg;

  // 存储各层原始 transform（用于恢复时保留居中）
  var origBgTransform  = bg  ? (bg.style.transform  || '') : '';
  var origMidTransform = mid ? (mid.style.transform || '') : '';
  var origFgTransform  = fg  ? (fg.style.transform  || '') : '';
  var origCharTransform = charEl ? (charEl.style.transform || 'translate(-50%, -50%)') : '';

  // 背景噪声纹理不需要视差
  function onMouseMove(e) {
    var cx = window.innerWidth  / 2;
    var cy = window.innerHeight / 2;
    var dx = (e.clientX - cx) / cx; // -1 ~ +1
    var dy = (e.clientY - cy) / cy; // -1 ~ +1

    // 背景文字 — 轻微反向（-0.4）
    if (bg) {
      var bgX = (dx * -12).toFixed(1);
      var bgY = (dy * -8).toFixed(1);
      bg.style.transform = origBgTransform
        ? origBgTransform + ' translate(' + bgX + 'px,' + bgY + 'px)'
        : 'translate(' + bgX + 'px,' + bgY + 'px)';
    }
    // 中间内容 — 反向（-0.6）
    if (mid) {
      var midX = (dx * -18).toFixed(1);
      var midY = (dy * -12).toFixed(1);
      mid.style.transform = origMidTransform
        ? origMidTransform + ' translate(' + midX + 'px,' + midY + 'px)'
        : 'translate(' + midX + 'px,' + midY + 'px)';
    }
    // 前景/信件 — 反向（-1.0，最强）
    if (fg) {
      var fgX = (dx * -30).toFixed(1);
      var fgY = (dy * -20).toFixed(1);
      fg.style.transform = origFgTransform
        ? origFgTransform + ' translate(' + fgX + 'px,' + fgY + 'px)'
        : 'translate(' + fgX + 'px,' + fgY + 'px)';
    }
    // 中央「難」字 — 反向且有轻微旋转
    if (charEl) {
      var rotY = (dx * 0.6).toFixed(2);
      var rotX = (-dy * 0.4).toFixed(2);
      charEl.style.transform =
        'translate(-50%, -50%) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    }
  }

  function onMouseLeave() {
    if (bg)        bg.style.transform        = origBgTransform;
    if (mid)       mid.style.transform       = origMidTransform;
    if (fg)        fg.style.transform        = origFgTransform;
    if (charEl)    charEl.style.transform     = origCharTransform;
  }

  zone3El.addEventListener('mousemove', onMouseMove);
  zone3El.addEventListener('mouseleave', onMouseLeave);
  },

  /**
   * 「難」字随机微弱震动效果
   * 每隔 [interval] ms 触发一次随机微小位移，
   * 表现内心挣扎、漂泊不定的感觉。
   * @param {HTMLElement} charEl - 「難」字元素
   * @param {number} interval - 触发间隔（ms），默认 5000
   */
  initZone3Shake: function(charEl, interval) {
    if (!charEl) return;
    var id;
    var isActive = false;

    function shake() {
      if (!isActive) return;
      // 随机偏移量：±3px，角度 ±0.3deg
      var tx = (Math.random() - 0.5) * 6;
      var ty = (Math.random() - 0.5) * 4;
      var rz = (Math.random() - 0.5) * 0.6;
      charEl.style.transition = 'transform 0.15s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
      charEl.style.transform =
        'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px)) rotate(' + rz + 'deg)';

      // 0.15s 后弹回
      setTimeout(function() {
        if (!isActive) return;
        charEl.style.transition = 'transform 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
        charEl.style.transform = 'translate(-50%, -50%)';
      }, 160);
    }

    function start() {
      isActive = true;
      schedule();
    }

    function schedule() {
      id = setTimeout(function() {
        shake();
        schedule();
      }, interval || 5000);
    }

    function stop() {
      isActive = false;
      clearTimeout(id);
      charEl.style.transition = '';
      charEl.style.transform = 'translate(-50%, -50%)';
    }

    // 暴露控制接口
    charEl._shake = { start: start, stop: stop };

    // 页面激活时启动，页面离开时停止（由 NavigationController 决定）
    start();
  }
};
